import { expect } from 'chai';

import axios from 'axios';

import { CompilerWrapper, CompileRequest, CompileStatus } from './compiler';

import { connect, keyStores, KeyPair, Account } from "near-api-js";


// Extend the Mocha context so we can pass variables between before() and test methods
// See https://stackoverflow.com/questions/62282408/how-to-extend-mochas-context-interface/62283449#62283449
declare module "mocha" {
    export interface Context {
        // Compiler Object
        compiler : CompilerWrapper;

        // NEAR API
        account : Account;

        // Example Scripts
        log_example : string;
        counter_example : string;
        cross_contract_example : string;
        fungible_token_example : string;
        non_fungible_token_example : string;
    }
  }

describe('Compiler', function(){
    before(async function() {
        // Create and initialize compiler
        this.compiler = new CompilerWrapper();
        await this.compiler.init();

        // Create connection to test 
        const myKeyStore = new keyStores.InMemoryKeyStore();
        const PRIVATE_KEY =
          "ed25519:2r56cCpfrMb5PJyKVBX45jwLKsVDZL4eRBriQECDvT4TRmD6J2gQwhvRwfy7eE9vnYVJW7KdTQ38hDmVdXSZ85cA";
        // creates a public / private key pair using the provided private key
        const keyPair = KeyPair.fromString(PRIVATE_KEY);
        // adds the keyPair you created to keyStore
        await myKeyStore.setKey("testnet", "test-remote-compiler.testnet", keyPair);

        const connectionConfig = {
            networkId: "testnet",
            keyStore: myKeyStore, // first create a key store 
            nodeUrl: "https://rpc.testnet.near.org",
            walletUrl: "https://wallet.testnet.near.org",
            helperUrl: "https://helper.testnet.near.org",
            explorerUrl: "https://explorer.testnet.near.org",
          };
        const nearConnection = await connect(connectionConfig);
        this.account = await nearConnection.account('test-remote-compiler.testnet');

        // Fetch examples from GitHub
        this.log_example = (await axios.get('https://raw.githubusercontent.com/near/near-sdk-js/develop/examples/src/log.ts')).data;
        this.counter_example = (await axios.get('https://raw.githubusercontent.com/near/near-sdk-js/develop/examples/src/counter.ts')).data;
        this.cross_contract_example = (await axios.get('https://raw.githubusercontent.com/near/near-sdk-js/develop/examples/src/cross-contract-call.js')).data;
        this.fungible_token_example = (await axios.get('https://raw.githubusercontent.com/near/near-sdk-js/develop/examples/src/fungible-token.ts')).data;
        this.non_fungible_token_example = (await axios.get('https://raw.githubusercontent.com/near/near-sdk-js/develop/examples/src/non-fungible-token.js')).data;
    });

    it('should compile the log example',  async function() {
        const files = {
            'log.ts' : this.log_example,
        };
        const request : CompileRequest = {
            sdk_version : "0.6.0",
            files : files,
            entrypoint : 'log.ts',
            dependencies: {}
        };
        const result = await this.compiler.compile(request);

        expect(result.status).to.equal(CompileStatus.SUCCESS);
        expect(result.wasm_contract).to.not.be.undefined;

        // Validate the contract
        const contractWasm = Uint8Array.from(result.wasm_contract as string, x => x.charCodeAt(0));
        expect(WebAssembly.validate(contractWasm)).to.be.true;

        // Deploy the contract
        const deployResult = await this.account.deployContract(contractWasm);
        expect(deployResult.status).to.have.property('SuccessValue');
        expect(deployResult.status).to.not.have.property('Failure');
    });

    it('should compile the counter example',  async function() {
        const files = {
            'log.ts' : this.log_example,
            'counter.ts' : this.counter_example,
        };
        const request : CompileRequest = {
            sdk_version : "0.6.0",
            files : files,
            entrypoint : 'counter.ts',
            dependencies: {
                'lodash-es' : "^4.17.21"
            }
        };
        const result = await this.compiler.compile(request);

        expect(result.status).to.equal(CompileStatus.SUCCESS);
        expect(result.wasm_contract).to.not.be.undefined;

        // Validate the contract
        const contractWasm = Uint8Array.from(result.wasm_contract as string, x => x.charCodeAt(0));
        expect(WebAssembly.validate(contractWasm)).to.be.true;

        // Deploy the contract
        const deployResult = await this.account.deployContract(contractWasm);
        expect(deployResult.status).to.have.property('SuccessValue');
        expect(deployResult.status).to.not.have.property('Failure');
    });

    it('should compile the cross contract example',  async function() {
        const files = {
            'cross-contract-call.js' : this.cross_contract_example,
        };
        const request : CompileRequest = {
            sdk_version : "0.6.0",
            files : files,
            entrypoint : 'cross-contract-call.js',
            dependencies: {}
        };
        const result = await this.compiler.compile(request);

        expect(result.status).to.equal(CompileStatus.SUCCESS);
        expect(result.wasm_contract).to.not.be.undefined;

        // Validate the contract
        const contractWasm = Uint8Array.from(result.wasm_contract as string, x => x.charCodeAt(0));
        expect(WebAssembly.validate(contractWasm)).to.be.true;

        // Deploy the contract
        const deployResult = await this.account.deployContract(contractWasm);
        expect(deployResult.status).to.have.property('SuccessValue');
        expect(deployResult.status).to.not.have.property('Failure');
    });

    it('should compile the non-fungible token example',  async function() {
        const files = {
            'fungible-token.ts' : this.fungible_token_example,
        };
        const request : CompileRequest = {
            sdk_version : "0.6.0",
            files : files,
            entrypoint : 'fungible-token.ts',
            dependencies: {}
        };
        const result = await this.compiler.compile(request);

        expect(result.status).to.equal(CompileStatus.SUCCESS);

        // Validate the contract
        const contractWasm = Uint8Array.from(result.wasm_contract as string, x => x.charCodeAt(0));
        expect(WebAssembly.validate(contractWasm)).to.be.true;

        // Deploy the contract
        const deployResult = await this.account.deployContract(contractWasm);
        expect(deployResult.status).to.have.property('SuccessValue');
        expect(deployResult.status).to.not.have.property('Failure');
    });

    it('should compile the fungible token example',  async function() {
        const files = {
            'non-fungible-token.js' : this.non_fungible_token_example,
        };
        const request : CompileRequest = {
            sdk_version : "0.6.0",
            files : files,
            entrypoint : 'non-fungible-token.js',
            dependencies: {}
        };
        const result = await this.compiler.compile(request);

        expect(result.status).to.equal(CompileStatus.SUCCESS);
        expect(result.wasm_contract).to.not.be.undefined;

        // Validate the contract
        const contractWasm = Uint8Array.from(result.wasm_contract as string, x => x.charCodeAt(0));
        expect(WebAssembly.validate(contractWasm)).to.be.true;

        // Deploy the contract
        const deployResult = await this.account.deployContract(contractWasm);
        expect(deployResult.status).to.have.property('SuccessValue');
        expect(deployResult.status).to.not.have.property('Failure');
    });
});