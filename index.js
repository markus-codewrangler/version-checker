import axios from "axios";
import fs from "fs";
import path from "path";
import semver from "semver";
import { packages } from "./packages.js";

export async function fetchPackageInfo(packageName, installedVersion) {
  console.log("fetch", packageName, installedVersion);
  const response = await axios.get(
    `https://registry.npmjs.org/${packageName}`,
    { timeout: 3000 },
  );
  const latestVersion = response.data["dist-tags"].latest;
  const latestReleaseDate = response.data["time"][latestVersion];
  const installedVersionStripped = installedVersion.replace(/^\D+/, ""); // Remove the caret or tilde prefix
  const installedReleaseDate = response.data["time"][installedVersionStripped];
  const updateType = semver.diff(installedVersionStripped, latestVersion);

  return { latestVersion, latestReleaseDate, installedReleaseDate, updateType };
}

function hasUpdate(installedVersion, latestVersion) {
  return installedVersion !== latestVersion;
}

async function processDependencies(deps, depType) {
  let packageInfo = [];
  for (const currentPackage in deps) {
    const installedVersion = deps[currentPackage];
    const {
      latestVersion,
      latestReleaseDate,
      installedReleaseDate,
      updateType,
    } = await fetchPackageInfo(currentPackage, installedVersion);
    const updateAvailable = hasUpdate(
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
      OlderThanOneYear:
        new Date() - new Date(installedReleaseDate) > 365 * 24 * 60 * 60 * 1000,
      UpdateAvailable: updateAvailable,
      UpdateType: updateType || "n/a",
    });
  }
  return packageInfo;
}

async function generatePackageUpdatesCSV() {
  let allPackageInfo = [];
  allPackageInfo = allPackageInfo.concat(
    await processDependencies(packages.dependencies, "dependency"),
  );
  allPackageInfo = allPackageInfo.concat(
    await processDependencies(packages.devDependencies, "devDependency"),
  );

  const csvContent = [
    "Package,Type,Installed Version,Installed Release Date,Latest Version,Latest Release Date,Installed Version Older Than 1 Year,Update Available,Update Type",
    ...allPackageInfo.map(
      (info) =>
        `${info.Package},${info.Type},${info.InstalledVersion},${info.InstalledReleaseDate},${info.LatestVersion},${info.LatestReleaseDate},${info.OlderThanOneYear},${info.UpdateAvailable},${info.UpdateType}`,
    ),
  ].join("\n");

  fs.writeFileSync(path.join(process.cwd(), "package_updates.csv"), csvContent);
  console.log("Table generated and saved to package_updates.csv");
}

generatePackageUpdatesCSV().catch(console.error);
