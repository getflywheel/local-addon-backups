#!/usr/bin/env bash
#
# Helper to download and compile a universal binary for a program for MacOS.
#
# Supports downloading 'rclone'
set -e

# The version of the program to download.
VERSION=$1

# The directory to output the compiled binary to, defaulting to the current directory.
OUTPUT_DIR=${2:-$(pwd)}

# The directory to download and compile the program in, defaulting to a temporary directory.
WORK_DIR=$(mktemp -d)

# Clean up temporary directory on exit
trap 'rm -rf "$WORK_DIR"' EXIT

function help() {
    echo "Usage: $0 <version> [output_dir]"
    echo
    echo "  VERSION: The version of the program to download."
    echo "  OUTPUT_DIR: The directory to output the compiled binary to. Defaults to the current directory."
    echo
    echo "Example:"
    echo "  $0 0.17.3"
    echo "  $0 1.69.0 ../vendor"
}

if [ -z "$VERSION" ]; then
    echo "Version is required"
    echo ''
    help
    exit 1
fi

function download_and_extract() {
    local os=$1
    local arch=$2

	local folderSlug="rclone-v${VERSION}-${os}-${arch}"
	local file="${folderSlug}.zip"

    echo "Downloading ${file}"
    curl -sL "https://github.com/rclone/rclone/releases/download/v${VERSION}/rclone-v${VERSION}-${os}-${arch}.zip" -o "${WORK_DIR}/${file}" || { echo "Failed to download ${file}"; exit 1; }

    echo "Extracting ${file}"
    unzip -q "${WORK_DIR}/${file}" -d "${WORK_DIR}" || { echo "Failed to unzip ${file}"; exit 1; }

	local nixBin="${WORK_DIR}/${folderSlug}/rclone"
	local winBin="${WORK_DIR}/${folderSlug}/rclone.exe"
    if [ -f $nixBin ]; then mv ${nixBin} "${WORK_DIR}/rclone-${os}-${arch}"; fi;
    if [ -f $winBin ]; then mv ${winBin} "${WORK_DIR}/rclone-${os}-${arch}.exe"; fi;
}


download_and_extract "osx" "amd64"
download_and_extract "osx" "arm64"
download_and_extract "windows" "386"
download_and_extract "windows" "amd64"
download_and_extract "linux" "amd64"

echo ''
echo "Creating MacOS universal binary..."
lipo -create "${WORK_DIR}/rclone-osx-amd64" "${WORK_DIR}/rclone-osx-arm64" -output "${WORK_DIR}/rclone-osx-universal" || { echo "Failed to create universal binary for rclone"; exit 1; }
chmod +x "${WORK_DIR}/rclone-osx-universal"
file "${WORK_DIR}/rclone-osx-universal"


echo ''
echo 'Removing everything except desired bins...'
rm -rf ${WORK_DIR}/rclone-v${VERSION}-* ${WORK_DIR}/*.zip ${WORK_DIR}/rclone-osx-{arm64,amd64}

chmod +x ${WORK_DIR}/*

echo ''
echo "Copying bins to ${OUTPUT_DIR}..."
cd ${OUTPUT_DIR} && \
	mkdir -p darwin linux win32 win64 && \
	mv ${WORK_DIR}/rclone-osx-universal darwin/rclone && \
	mv ${WORK_DIR}/rclone-linux-amd64 linux/rclone && \
	mv ${WORK_DIR}/rclone-windows-amd64.exe win64/rclone.exe && \
	mv ${WORK_DIR}/rclone-windows-386.exe win32/rclone.exe

echo ''
echo "Build completed successfully."
