import path from 'path';
import os from 'os';
import fsPromises from 'fs/promises';
const fileExists = async (path: string) => !!(await fsPromises.stat(path).catch(e => false));

import util from 'node:util';
import child_process from 'node:child_process';
const exec = util.promisify(child_process.exec);

import { logger } from './logger';

import { v4 as uuidv4 } from 'uuid';


export interface CompileRequest {
    sdk_version: string; // Version string
    entrypoint: string;
    files: { [filename: string]: string };
    dependencies: { [package_name: string]: string };
}

export enum CompileStatus {
    SUCCESS = 1,
    FAILURE = 2,
}

export enum ErrorType {
    NONE = 0,
    CLIENT = 1,
    SERVICE = 2,
}

export interface CompileResult {
    status: CompileStatus;
    error_type?: ErrorType;
    stdout?: string;
    stderr?: string;
    wasm_contract?: string; // WASM contract, as a string
}

const FILENAME_REGEX = /^([A-z0-9_-]+)\.(ts|js)$/;
const VERSION_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/

export class CompilerWrapper {
    static parent_dir = path.join(os.tmpdir(), 'near-compiler');
    static cache_dir = path.join(CompilerWrapper.parent_dir, 'npm-cache');

    public async init() {

        // Create parent directory
        if (!(await fileExists(CompilerWrapper.parent_dir))) {
            await fsPromises.mkdir(CompilerWrapper.parent_dir);
        }

        // Create NPM Cache dir
        if (!(await fileExists(CompilerWrapper.parent_dir))) {
            await fsPromises.mkdir(CompilerWrapper.parent_dir);
        }
    }

    public async compile(request: CompileRequest): Promise<CompileResult> {
        let logObj: any = {};

        const build_uuid = uuidv4();
        logObj.build_uuid = build_uuid;

        // Create a working directory for the build
        const workdir = await fsPromises.mkdtemp(path.join(CompilerWrapper.parent_dir, build_uuid));
        logObj.workdir = workdir;
        logger.debug(logObj, 'Starting build');

        const exit = async (result: CompileResult) => {
            // Cleanup the temporary folder
            await fsPromises.rm(workdir, { recursive: true, force: true });
            return result;
        };

        // Validate the filesystem
        for (let [filename, contents] of Object.entries(request.files)) {
            // Validate Filename
            if (!FILENAME_REGEX.test(filename)) {
                logger.error(logObj, `Invalid filename ${filename}`);

                // Return failure
                return exit({
                    status: CompileStatus.FAILURE,
                    error_type: ErrorType.SERVICE,
                });
            }
        }

        // Create the package.json
        if (request.sdk_version !== "develop" && !VERSION_REGEX.test(request.sdk_version)) {
            logger.error(logObj, `Invalid version name ${request.sdk_version}`);
            // Return failure
            return exit({
                status: CompileStatus.FAILURE,
                error_type: ErrorType.SERVICE,
            });
        }

        let packageJson = {};
        if (request.sdk_version == "develop")
        {
            //Run canary build
            packageJson = {
                "type": "module",
                "dependencies": {
                    "near-sdk-js": "near/near-sdk-js",
                    //"near-sdk-js": "near/near-sdk-js#e90d9bf9330d0a17cf6c0c215981f377ddadd740",
                    "typescript": "^4.8.4",
                    ...request.dependencies
                },
            };
        }
        else
        {
            packageJson = {
                "type": "module",
                "dependencies": {
                    "near-sdk-js": request.sdk_version,
                    // Note: This can be removed once  https://github.com/near/near-sdk-js/issues/284 is resolved
                    "ts-morph": "^16.0.0",
                    "typescript": "^4.8.4",
                    ...request.dependencies
                },
            };
        }
        request.files["package.json"] = JSON.stringify(packageJson);

        // Copy the filesystem to disk
        for (let [filename, contents] of Object.entries(request.files)) {
            const local_source_file = path.join(workdir, filename);

            try {
                await fsPromises.writeFile(local_source_file, contents, {});
            } catch (error: any) {
                logObj.error = error.toString();
                logger.error(logObj, `Error when saving file ${filename} to workdir`);

                // Return failure
                return exit({
                    status: CompileStatus.FAILURE,
                    error_type: ErrorType.SERVICE,
                });
            }
        }

        // Initialize the build environment
        const initOptions: child_process.ExecOptions = {
            cwd: workdir,
        };
        try {
            await exec(`npm i --cache "${CompilerWrapper.cache_dir}"`, initOptions);
            logger.debug(logObj, 'Successfully initialized build environment.');
        } catch (error: any) {
            logObj.error = error.toString();
            logObj.stderr = error.stderr;
            logObj.stdout = error.stdout;
            logger.debug(logObj, 'Failed to initialize build environment');

            // Return failure
            return exit({
                status: CompileStatus.FAILURE,
                error_type: ErrorType.CLIENT,
                stdout: error.stdout,
                stderr: error.stderr,
            });
        }

        // Invoke the compiler CLI
        const buildOptions: child_process.ExecOptions = {
            cwd: workdir,
        };

        let result;
        try {
            result = await exec(`npx -- near-sdk-js build --verbose "${request.entrypoint}"`, buildOptions);
        } catch (error: any) {
            logObj.error = error.toString();
            logObj.stderr = error.stderr;
            logObj.stdout = error.stdout;
            logger.debug(logObj, 'Failed to compile');
            console.log(error.stderr);

            // Cleanup the temporary folder
            await fsPromises.rm(workdir, { recursive: true, force: true });

            // Return failure
            return {
                status: CompileStatus.FAILURE,
                error_type: ErrorType.CLIENT,
                stdout: error.stdout,
                stderr: error.stderr,
            };
        }

        // Capture the result contract
        const local_binary_file = path.join(workdir, '/build/contract.wasm');
        const contract_wasm = await fsPromises.readFile(local_binary_file, { encoding: "binary" });

        // Cleanup the temporary folder
        await fsPromises.rm(workdir, { recursive: true, force: true });

        // Return the result
        logger.debug(logObj, 'Successfully compiled contract');
        return exit({
            status: CompileStatus.SUCCESS,
            stdout: result.stdout,
            stderr: result.stderr,
            wasm_contract: contract_wasm,
        });
    }
}