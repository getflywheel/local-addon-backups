#!/usr/bin/env bash
#
# Helper to download and compile a universal binary for a program for MacOS.
#
# Supports downloading 'restic'
set -e

# The version of the program to download.
VERSION=$1

# The directory to output the compiled binary to, defaulting to the current directory.
OUTPUT_DIR=${2:-$(pwd)}

# The directory to download and compile the program in, defaulting to a temporary directory.
WORK_DIR=$(mktemp -d)

# Clean up temporary directory on exit
# trap 'rm -rf "$WORK_DIR"' EXIT

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
	local extension=$3

	local folderSlug="restic_v${VERSION}_${os}_${arch}"
	local file="${folderSlug}.${extension}"

	local url="https://github.com/restic/restic/releases/download/v${VERSION}/restic_${VERSION}_${os}_${arch}.${extension}"

	echo "Downloading ${url} to ${file}"
	curl -sL ${url} -o "${WORK_DIR}/${file}" || { echo "Failed to download ${file}"; exit 1; }

	echo "Extracting ${file}"
	case $extension in
		"zip")
			unzip -q "${WORK_DIR}/${file}" -d "${WORK_DIR}" || { echo "Failed to unzip ${file}"; exit 1; }
			;;
		"bz2")
			bzip2 -d "${WORK_DIR}/${file}" || { echo "Failed to extract ${file}"; exit 1; }
			;;
		*)
			echo "Unknown extension: ${extension}"
			exit 1
			;;
	esac


	local nixBin="${WORK_DIR}/${folderSlug}/${folderSlug}"
	local winBin="${WORK_DIR}/${folderSlug}.exe"
	if [ -f $nixBin ]; then mv ${nixBin} "${WORK_DIR}/restic-${os}-${arch}"; fi;
	if [ -f $winBin ]; then mv ${winBin} "${WORK_DIR}/restic-${os}-${arch}.exe"; fi;
}


download_and_extract "darwin" "amd64" "bz2"
download_and_extract "darwin" "arm64" "bz2"
download_and_extract "linux" "amd64" "bz2"
download_and_extract "windows" "386" "zip"
download_and_extract "windows" "amd64" "zip"

echo ''
echo "Creating MacOS universal binary..."
lipo -create "${WORK_DIR}/restic_v${VERSION}_darwin_amd64" "${WORK_DIR}/restic_v${VERSION}_darwin_arm64" -output "${WORK_DIR}/restic_v${VERSION}_darwin_universal" || { echo "Failed to create universal binary for restic"; exit 1; }
chmod +x "${WORK_DIR}/restic_v${VERSION}_darwin_universal"
file "${WORK_DIR}/restic_v${VERSION}_darwin_universal"


echo ''
echo 'Removing everything except desired bins...'
rm -rf ${WORK_DIR}/restic-v${VERSION}-* ${WORK_DIR}/*.zip ${WORK_DIR}/restic-darwin-{arm64,amd64}


echo ''
echo "Copying bins to ${OUTPUT_DIR}..."
cd ${OUTPUT_DIR} && \
	mkdir -p darwin linux win32 win64 && \
	cp ${WORK_DIR}/restic_v${VERSION}_darwin_universal darwin/restic && \
	cp ${WORK_DIR}/restic_v${VERSION}_linux_amd64 linux/restic && \
	cp ${WORK_DIR}/restic_${VERSION}_windows_amd64.exe win64/restic.exe && \
	cp ${WORK_DIR}/restic_${VERSION}_windows_386.exe win32/restic.exe

echo ''
echo "Build completed successfully."
