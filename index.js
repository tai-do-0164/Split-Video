import { execSync, exec, spawn } from 'child_process';
import { mkdirSync, readFileSync } from 'fs';

async function bootstrap() {

    const watch = Date.now()
    // Split video into smaller chunks
    const name = process.argv[2]
    if (!name?.length) {
        console.error("Video file name not provided");
        process.exit(1);
    }
    const fileSize = process.arch[3] ?? 9 * 1024 * 1024; // 10MB

    console.log('name', name, fileSize);

    const result = execSync(`ffprobe -v quiet -print_format json -show_streams "${name}"`, { encoding: 'utf8' });
    const json = JSON.parse(result);
    const stream = json.streams.find(s => s.codec_type === 'video');

    const outDir = `${name.split('/').pop().split('.')[0]}_${Date.now()}`

    mkdirSync(outDir, { recursive: true })

    // Resize, zip: -c:v libx264 -crf 23 -r 30 -c:a copy -vf scale=1080:-2 54mb -> 3.5mb
    // Supper fast: -c copy
    const child = spawn('sh', [`./script.sh`, `${name}`, fileSize, `${outDir}`, `-c:v libx264 -crf 23 -c:a copy -vf scale=1080:-2,fps=15`], { stdio: 'inherit', detached: false })
    child.on('close', (code) => {
        resolveFunc()
    })
    let resolveFunc, rejectFunc;
    await new Promise((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
    })
    // execSync(`./script.sh "${name}" ${fileSize} "${outDir}" "-c:v libx264 -crf 23 -c:a copy -vf scale=1080:-2"`, { encoding: 'utf8' });
    // ./split-video.sh huge-video.mov 64000000 "-c:v libx264 -crf 23 -c:a copy -vf scale=960:-1"
    // node index.js /Users/tai.do/Downloads/Screen_Recording_2025-08-01_at_13.29.45(2).mov
    // execSync(`./script.sh "${name}" ${fileSize} "${outDir}" "-c:v libx264 -crf 23 -c:a copy -vf scale=960:-2"`);

    const elapsed = Date.now() - watch;
    console.log(`----------------------------\nExecution time: ${elapsed} ms\n----------------------------`);

}

bootstrap();
