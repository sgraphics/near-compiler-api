# Near Compiler API Server

## Design 
- Compiling near Javascript/Typescript code into WebAssembly is a complex process that is likely to change in upcoming versions. Rather than re-implementing this variable process, I decided to wrap the CLI build process directly.
- The CLI build process is dependent on system architecture and somewhat dependent on system libraries. Therefore, it a hypothetical NPM wrapper library is not likely to be portable. I have therefore opted to create a Docker image which exposes a compiler API service, as we discussed via Chat.

## How does it work?
- When the Docker image is started, a NodeJS server is started, exposed by default on port 8080.
- The NodeJS server listens for POST requests to the `/contract` endpoint. The request schema is defined in the `CompileRequest` interface.
- When a request is recieved, the server:
  - Creates a temporary folder
  - Initializes the build environment by constructing an artificial npm package and installing dependencies
  - Injects the users code into the folder
  - Builds the contract as WebAssembly, and then extracts it via the filesystem.
  - Returns the results to the user.

# Software Dependencies
- You will need NodeJS + NPM installed on your computer for local development.
- You will also need Docker installed on your computer to build the productionized image.

# Building
- Clone the repository, and run `npm i` to pull in the requisite dependencies.
- The application is built using Typescript. To compile, run the `./build.bash` command.
- To start the server for local development, run the `./start.bash` command.

# Testing 
 - I wrote tests using Mocha/Typescript in the `compiler.spec.ts` file.
 - These tests fetch example test cases from GitHub and compile them, then deploy them to a test account on the testnet.
 - These tests can be invoked inside the Docker environment using the `./test.sh` script.

 # Deployment
 Because the application is containerized, I would recommend running this using something like [Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/), [Elastic Container Service](https://aws.amazon.com/ecs/), or Azure Container Instances (https://azure.microsoft.com/en-us/products/container-instances/#overview). 
    - These all have easy configuration options for scaling the service based on performance metrics (such as CPU utilization).
    - Unlike the prior compiler integration I wrote for you, this compilation process is much more resource intensive; compile times take ~30 seconds on my local machine. You are likely going to need to scale horizontally to handle user load.
  
  I have also used [Pino](https://github.com/pinojs/pino) logging throughout the code to help inspect errors.  Pino [integrates](https://github.com/pinojs/pino/blob/master/docs/transports.md) with a number of other log providers (such as CloudWatch, Datadog, etc) so you can monitor the application remotely.