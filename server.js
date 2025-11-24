require('dotenv/config')
const { spawn, execSync } = require('child_process');
const { mkdirSync, readFileSync, unlinkSync } = require('fs');
const session = require("express-session");
const multer = require('multer')

const fs = require('fs');

const express = require('express');
const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    })
);

app.use(express.urlencoded({ extended: true }));

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(2)} ${sizes[i]}`;
}

app.post('/file', upload.single('file'), async (req, res) => {
    const file = req.file
    const size = req.body.size
    console.log(file, size);

    const outDir = `out/${file.originalname.split('/').pop().split('.')[0]}_${Date.now()}`
    const fileSize = 9 * 1024 * 1024;
    const name = __dirname + '/' + file.path
    mkdirSync(outDir, { recursive: true })
    const child = spawn('sh', [`./script.sh`, `${name}`, fileSize, `${outDir}`, size === 'keep' ? '' : `-c:v libx264 -crf 23 -c:a copy -vf scale=${size}:-2,fps=15`], { stdio: 'inherit', detached: false })
    child.on('close', (code) => {
        resolveFunc()
    })
    let resolveFunc, rejectFunc;
    await new Promise((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
    })
    unlinkSync(name)
    let content = readFileSync(__dirname + '/index.html')
    const files = fs.readdirSync(outDir)
    const resultDownload = files.map(file => {
        return `<a target="_blank" href="/file?path=${outDir}/${file}">Download ${file} (${formatBytes(fs.statSync(`${outDir}/${file}`).size)})</a> (<a target="_blank" href="/file?path=${outDir}/${file}&type=preview">Preview</a>)`
    }).join('<br>')
    content = content.toString().replace('{{result}}', `Converted video done! 
        <br>
        ${resultDownload}
        <br>
        `)
    req.session.result = content;
    res.redirect('/result')
})

app.post('/merge', upload.array('files'), async (req, res) => {
    const files = req.files
    const file = files[0]
    console.log(file);

    const outDir = `out/${file.originalname.split('/').pop().split('.')[0]}_${Date.now()}`
    mkdirSync(outDir, { recursive: true })
    const now = Date.now()
    fs.writeFileSync(`uploads/list_${now}.txt`, files.map(f => `file '${f.filename}'`).join('\n'))
    execSync(`ffmpeg -f concat -i ${__dirname}/uploads/list_${now}.txt -c copy "${__dirname}/${outDir}/output.mp4"`)

    let content = readFileSync(__dirname + '/index.html')
    const outFiles = fs.readdirSync(outDir)
    const resultDownload = outFiles.map(file => {
        return `<a target="_blank" href="/file?path=${outDir}/${file}">Download ${file} (${formatBytes(fs.statSync(`${outDir}/${file}`).size)})</a> (<a target="_blank" href="/file?path=${outDir}/${file}&type=preview">Preview</a>)`
    }).join('<br>')
    content = content.toString().replace('{{result}}', `Converted video done! 
        <br>
        ${resultDownload}
        <br>
        `)
    req.session.result = content;
    res.redirect('/result')
})

app.get('/result', async (req, res) => {
    const result = req.session.result;
    delete req.session.result;
    if (!result?.length) {
        return res.redirect('/')
    }
    res.send(result);
})

app.get('/', async (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/file', async (req, res) => {
    const path = req.query.path
    const type = req.query.type
    if (path.includes('../') || !path.startsWith('out')) {
        return res.status(403).send('Forbidden');
    }
    if (type === 'preview') {
        return res.sendFile(__dirname + `/${path}`)
    }
    res.download(__dirname + `/${path}`)
})

app.listen(+process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}. http://localhost:${process.env.PORT}`);
});

