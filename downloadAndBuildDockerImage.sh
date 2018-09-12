#!/usr/bin/env bash

set -e

# Check for specific arguments
while [ "$END_OF_ARGUMENT_PARSING" != "true" ] ; do
  END_OF_ARGUMENT_PARSING=false
  if [ "$1" == "-u" ] || [ "$1" == "--username" ]; then
    OTN_USERNAME=$2
    shift
    shift
  elif [ "$1" == "-P" ] || [ "$1" == "--password" ]; then
    echo "Warning: Using a password on the command line interface can be insecure."
    OTN_PASSWORD=$2
    shift
    shift
  elif [ "$1" == "-p" ] || [ "$1" == "--ask-password" ]; then
    echo -n "OTN password: "
    read -s OTN_PASSWORD
    shift
  elif [ "$1" == "--" ]; then
    shift
  elif [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    cat <<EOF
$0 [-u|--username <OTN_USERNAME>] [-p|--ask-password] [-P|--password <OTN_PASSWORD>] [-- [other Oracle's buildDockerImage.sh options]]

Dependencies that must be installed before running this script: git, docker
EOF
    exit 0
  else
    END_OF_ARGUMENT_PARSING=true
  fi
done

while [[ -z "$OTN_USERNAME" ]]; do
  echo -n "OTN username? "
  read OTN_USERNAME
done

while [[ -z "$OTN_PASSWORD" ]]; do
  echo -n "OTN password? "
  read -s OTN_PASSWORD
  echo ""
done

BASE_FOLDER=$(readlink -f `dirname $0`)

ORACLE_DOCKER_IMAGES_DIR="$BASE_FOLDER/oracle-docker-images"

if [ ! -d "$ORACLE_DOCKER_IMAGES_DIR" ]; then
  cd "$BASE_FOLDER"
  echo "Git clone Oracle docker-images project"
  git clone https://github.com/oracle/docker-images.git oracle-docker-images
fi

ORACLE_XE_MASTER_VERSION=11.2.0
ORACLE_XE_RPM_ZIP=oracle-xe-$ORACLE_XE_MASTER_VERSION-1.0.x86_64.rpm.zip
ORACLE_XE_FOLDER_NAME=$ORACLE_XE_MASTER_VERSION.2
ORACLE_DOCKER_IMAGES_DOCKERFILES_DIR="$ORACLE_DOCKER_IMAGES_DIR/OracleDatabase/SingleInstance/dockerfiles"
ORACLE_XE_RPM_ZIP_DIR="$ORACLE_DOCKER_IMAGES_DOCKERFILES_DIR/$ORACLE_XE_FOLDER_NAME"

if [ ! -f "$ORACLE_XE_RPM_ZIP_DIR/$ORACLE_XE_RPM_ZIP" ]; then
  echo "Downloading $ORACLE_XE_RPM_ZIP file"
  DOWNLOADER_DIR="$BASE_FOLDER/oracle-xe-downloader"
  cd "$DOWNLOADER_DIR"
  docker build --pull -t oracle-xe-downloader .
  # add SYS_ADMIN to avoid "Failed to move to new namespace: PID namespaces supported, Network namespace supported, but failed: errno = Operation not permitted" thanks to https://github.com/jessfraz/dockerfiles/issues/65#issuecomment-145731454
  chmod o+rwx "$ORACLE_XE_RPM_ZIP_DIR" # In order for this script to write in it
  docker run -it --rm --cap-add SYS_ADMIN \
    -e "OTN_USERNAME=$OTN_USERNAME" -e "OTN_PASSWORD=$OTN_PASSWORD" \
    -v "$DOWNLOADER_DIR/downloader.js:/app/downloader.js" \
    -v "$DOWNLOADER_DIR/package.json:/app/package.json" \
    -v "$ORACLE_XE_RPM_ZIP_DIR:/export" oracle-xe-downloader \
    sh -c "cd /app && node downloader.js $ORACLE_XE_RPM_ZIP /export"
fi

echo "Executing Oracle's buildDockerImage.sh"
cd "$ORACLE_DOCKER_IMAGES_DOCKERFILES_DIR"
"./buildDockerImage.sh" -v $ORACLE_XE_FOLDER_NAME -x $*