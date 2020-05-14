const CronJob = require("cron").CronJob;
const express = require('express');
const fs = require('fs');
const option_chain = require('./nse_lib');
const app = express();
const port = process.env.PORT || 8080;
app.use(express.static('wwwroot'))
app.get('/start', (req, res) => {
  new CronJob('0 * * * * *', function () {
    console.log('Downloading json...');
    saveData('NIFTY');
    saveData('BANKNIFTY');
  }, null, true, 'Asia/Kolkata');
  res.send('started');
});
app.get('*', (req, res) => res.redirect('/nifty.html'));
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

function saveData(instrument) {
  option_chain(instrument).then(data => {
    delete data.filtered;
    delete data.records.strikePrices;
    let expiryDates = data.records.expiryDates.splice(0, 5);
    data.records.data = data.records.data.filter(c => (expiryDates.indexOf(c.expiryDate) != -1));
    data.records.expiryDates = expiryDates;
    fs.writeFileSync('wwwroot/' + instrument.toLowerCase() + '.json', JSON.stringify(data));
  });
}

saveData('NIFTY');
saveData('BANKNIFTY');
new CronJob('0 13 9 * * 1-5', function () {
  new CronJob('0 * * * * *', function () {
    console.log('Downloading json...');
    saveData('NIFTY');
    saveData('BANKNIFTY');
  }, null, true, 'Asia/Kolkata');
}, null, true, 'Asia/Kolkata');
new CronJob('0 31 15 * * 1-5', function () {
  process.exit();
}, null, true, 'Asia/Kolkata');