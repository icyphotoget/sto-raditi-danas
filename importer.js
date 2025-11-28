// importer.js
// CLI verzija: da možeš lokalno pokrenuti `node importer.js`

const { runImportOnce } = require("./importerCore");

runImportOnce()
  .then((result) => {
    console.log("CLI importer završio. Upisano/azurirano:", result.count);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatalna greška u importeru (CLI):", err);
    process.exit(1);
  });
