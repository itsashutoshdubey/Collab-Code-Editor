import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// 1. Correct way to get Promise support for exec
const execPromise = promisify(exec);



// Recreating __dirname for ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//__dirname -> current directory's full path




// exec(command, options, callback);
//command: The shell command to run.
//options(optional): Object to configure execution(e.g., cwd, env, maxBuffer).
   // callback: Function(error, stdout, stderr) called when the command finishes.


async function executeCommand(dockerCommand, timeout = 5000) {
    try {
        // The promise-based exec returns an object with stdout and stderr directly
        const { stdout, stderr } = await execPromise(dockerCommand, { timeout: timeout });

        return { stdout, stderr };
    } catch (error) {
        // If the command fails or times out, it throws an error object
        // which contains the partial stdout/stderr produced before the failure
        return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
        };
    }
}

export async function executeCode(code, language, jobID) {
    // creates a directory
    const jobDir = path.join(__dirname, 'temp', jobID);
    await fs.mkdir(jobDir, { recursive: true });


    const codeFileName = 'code.cpp';
    const codeFilePath = path.join(jobDir, codeFileName);

   let containerName = `code-runner-${jobID}`;
        
    
  

    const IMAGE_NAME = 'code-runner-image';
     

    /*
  docker run --rm: "Run" creates the container; --rm tells Docker to delete the container's disk space immediately after the code finishes so your server doesn't get full
--name ${containerName}: Gives the container a unique name using your jobID so you can identify it or kill it if it gets stuck.

-v "${jobDir}:/app": The Volume Mount. This "mirrors" your host's temporary folder into the container's /app folder.

-w /app: Sets the "Working Directory" so that when the compiler looks for code.cpp, it looks inside the mounted folder.

--memory=100m: Limits the RAM to 100MB. This prevents a user from writing a "memory leak" script that crashes your entire server.

--cpus="0.5": Limits the container to half of one CPU core so it cannot slow down other users' code.

--network none: Disables the internet inside the container. This prevents users from using your server to attack other websites or download malware.
-- user sandboxuser: By default, everything inside a Docker container runs as the root user (the "Super Admin"). The --user sandboxuser flag tells Docker to strip away those admin privileges and run the code as a restricted, low-level user instead.

${IMAGE_NAME}: Tells Docker which image (the one you built from the Dockerfile) to use.

/bin/sh -c "...": This starts a shell to run two commands in a row:

g++ code.cpp -o a.out: Compiles the code.

&& ./a.out: The && means "if the first part worked, do the second part," which is running the compiled program.

    */
    const dockerCommand = `docker run --rm \
    --name ${containerName} \
    -v "${jobDir}:/app" \
    -w /app \
    --memory=100m \
    --cpus="0.5" \
    --network none \
    --user sandboxuser \
    ${IMAGE_NAME} /bin/sh -c "g++ code.cpp -o a.out && ./a.out"`;
    

    try {
        await fs.writeFile(codeFilePath, code);
         const result = await executeCommand(dockerCommand, 5000);
         
         return result;
        
       

    }
    catch (e) {
        console.error("Execution Failed:", e.message);
        return { status: 'ERROR', output: e.stdout, error: e.stderr };
    }
    finally {
        // 4. CLEANUP: Delete the entire folder (including a.out and temp files)
        // Use fs.rm with recursive: true to delete the folder itself
        await fs.rm(jobDir, { recursive: true, force: true }).catch(
            () => console.error(`Failed to clean up directory: ${jobDir}`)
    );
    }
}