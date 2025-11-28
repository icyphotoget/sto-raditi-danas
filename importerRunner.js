// importerRunner.js
// Wrapper koji poziva core importer iz API endpointa (bez process.exit)

const { runImportOnce } = require("./importerCore");

async function runImporterFromApi() {
  const result = await runImportOnce();
  return result;
}

module.exports = {
  runImporterFromApi,
};
