import axios from "axios";
import fs from "fs";
import path from "path";
import { packages } from "./packages.js";

// Function to fetch the latest version and release date of a package
async function fetchPackageInfo(packageName) {
  console.log("fetch", packageName);
  const response = await axios.get(
    `https://registry.npmjs.org/${packageName}`,
    { timeout: 3000 },
  );
  const latestVersion = response.data["dist-tags"].latest;
  const releaseDate = response.data["time"][latestVersion];
  return { latestVersion, releaseDate };
}

// Function to determine if an update is needed
function needsUpdate(installedVersion, latestVersion) {
  return installedVersion !== latestVersion;
}

// Example package.json content

// Function to process each dependency and devDependency
async function processDependencies(deps, depType) {
  let packageInfo = [];
  for (const currentPackage in deps) {
    const installedVersion = deps[currentPackage];
    const { latestVersion, releaseDate } = await fetchPackageInfo(
      currentPackage,
    );
    const updateNeeded = needsUpdate(installedVersion.slice(1), latestVersion);
    packageInfo.push({
      Package: currentPackage,
      Type: depType,
      InstalledVersion: installedVersion,
      LatestVersion: latestVersion,
      ReleaseDate: new Date(releaseDate).toISOString().slice(0, 10),
      UpdateNeeded: updateNeeded,
    });
  }
  return packageInfo;
}

// Function to generate and save the package information to a CSV file
async function generatePackageUpdatesCSV() {
  let allPackageInfo = [];
  allPackageInfo = allPackageInfo.concat(
    await processDependencies(packages.dependencies, "dependency"),
  );
  allPackageInfo = allPackageInfo.concat(
    await processDependencies(packages.devDependencies, "devDependency"),
  );

  const csvContent = [
    "Package,Type,Installed Version,Latest Version,Release Date,Update Needed",
    ...allPackageInfo.map(
      (info) =>
        `${info.Package},${info.Type},${info.InstalledVersion},${info.LatestVersion},${info.ReleaseDate},${info.UpdateNeeded}`,
    ),
  ].join("\n");

  fs.writeFileSync(path.join(process.cwd(), "package_updates.csv"), csvContent);
  console.log("Table generated and saved to package_updates.csv");
}

// Call the function to generate the CSV
generatePackageUpdatesCSV().catch(console.error);
