import axios from "axios";
import fs from "fs";
import path from "path";
import { packages } from "./packages.js";

// Function to fetch the latest version and release date of a package
export async function fetchPackageInfo(packageName, installedVersion) {
  console.log("fetch", packageName, installedVersion);
  const response = await axios.get(
    `https://registry.npmjs.org/${packageName}`,
    { timeout: 3000 },
  );
  const latestVersion = response.data["dist-tags"].latest;
  const latestReleaseDate = response.data["time"][latestVersion];
  const installedVersionStripped = installedVersion.replace(/^\D+/, ""); // Remove the caret or tilde prefix
  // Fetch the release date of the installed version directly
  const installedReleaseDate = response.data["time"][installedVersionStripped];

  return { latestVersion, latestReleaseDate, installedReleaseDate };
}

// Function to determine if an update is needed
function needsUpdate(installedVersion, latestVersion) {
  return installedVersion !== latestVersion;
}

// Function to process each dependency and devDependency
async function processDependencies(deps, depType) {
  let packageInfo = [];
  for (const currentPackage in deps) {
    const installedVersion = deps[currentPackage];
    const { latestVersion, latestReleaseDate, installedReleaseDate } =
      await fetchPackageInfo(currentPackage, installedVersion);
    const updateNeeded = needsUpdate(
      installedVersion.replace(/^\D+/, ""),
      latestVersion,
    );
    packageInfo.push({
      Package: currentPackage,
      Type: depType,
      InstalledVersion: installedVersion,
      InstalledReleaseDate: new Date(installedReleaseDate)
        .toISOString()
        .slice(0, 10),
      LatestVersion: latestVersion,
      LatestReleaseDate: new Date(latestReleaseDate).toISOString().slice(0, 10),
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
    "Package,Type,Installed Version,Installed Release Date,Latest Version,Latest Release Date,Update Needed",
    ...allPackageInfo.map(
      (info) =>
        `${info.Package},${info.Type},${info.InstalledVersion},${info.InstalledReleaseDate},${info.LatestVersion},${info.LatestReleaseDate},${info.UpdateNeeded}`,
    ),
  ].join("\n");

  fs.writeFileSync(path.join(process.cwd(), "package_updates.csv"), csvContent);
  console.log("Table generated and saved to package_updates.csv");
}

// Call the function to generate the CSV
generatePackageUpdatesCSV().catch(console.error);
