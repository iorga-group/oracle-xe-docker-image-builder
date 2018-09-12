# Oracle XE Docker image builder
*A shell command to automatically download and build an Oracle XE database Docker image*

It will download the [official Oracle Docker images builder](https://github.com/oracle/docker-images), then download an Oracle XE database `.rpm.zip` file using the OTN username & password you give the script, and finally use the official `buildDockerImage.sh` in order to finally build the Oracle XE Docker image.

## Installation
Dependencies that must be installed before running this script: `git`, `docker`.

Then, execute:
```bash
git clone https://github.com/iorga-group/oracle-xe-docker-image-builder.git
cd oracle-xe-docker-image-builder
```

## Usage
```bash
./downloadAndBuildDockerImage.sh [-u|--username <OTN_USERNAME>] [-p|--ask-password] [-P|--password <OTN_PASSWORD>] [-- [other Oracle's buildDockerImage.sh options]]
```
For example:
```bash
./downloadAndBuildDockerImage.sh -u myuser@mycompany.com -p
```
will then ask your OTN password for `myuser@mycompany.com` and will then build the Oracle XE database Docker image.
