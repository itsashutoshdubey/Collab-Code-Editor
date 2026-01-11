import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import fs from 'fs';
import {executeCode} from './executeCode.js';

// 1. Create a single connection instance
const connection = new IORedis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null
});


const worker = new Worker('execute-code', async (job)=>{
const jobID = job.id;
const {codeToExecute, languageToExecute} = job.data;


try {
    const result = await executeCode(codeToExecute, languageToExecute, jobID);
   console.log(`Job ${jobID} completed. Result:`, result);

    // WHATEVER YOU RETURN HERE becomes the 'returnvalue' in QueueEvents
   return result;

}
catch (error) {
    console.error("Error processing job:", error);
    throw error;
}

}, {connection: connection,
    
}); 


worker.on('ready', () => {
    console.log(' Worker has successfully connected to Redis!');
});

worker.on('error', (err) => {
    console.error(' Worker connection error:', err);
});