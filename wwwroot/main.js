var config = {};
var optionChainData, lastUpdated, underlyingValue, selected_expiry, option_chain = [];

function drawOIChgChart(context) {
    let headers = ['Strike Prices', 'Call OI Chg', 'Put OI Chg'];
    let values = context.option_chain.map(strike => {
        return [
            String(strike.strikePrice),
            parseInt(String(strike.PE.changeinOpenInterest).replace(/,/g, '')),
            parseInt(String(strike.CE.changeinOpenInterest).replace(/,/g, '')),
        ]
    });
    console.log([...headers, ...values]);
    var data = google.visualization.arrayToDataTable([headers, ...values]);

    var options = {
        chart: {
            title: 'Change in Open Interest | Underlying Value: ' + context.underlyingValue,
            subtitle: 'Last Updated: ' + lastUpdated,
        },
        colors: ['red', 'green'],
        legend: {
            position: 'none'
        }
    };
    var chart = new google.charts.Bar(document.getElementById('oiChgChart'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
}

function drawOIChart(context) {
    let headers = ['Strike Prices', 'Call OI', 'Put OI'];
    let values = context.option_chain.map(strike => {
        return [
            String(strike.strikePrice),
            parseInt(String(strike.PE.openInterest).replace(/,/g, '')),
            parseInt(String(strike.CE.openInterest).replace(/,/g, '')),
        ]
    });
    console.log([...headers, ...values]);
    var data = google.visualization.arrayToDataTable([headers, ...values]);

    var options = {
        chart: {
            title: 'Open Interest | Underlying Value: ' + context.underlyingValue,
            subtitle: 'Last Updated: ' + lastUpdated,
        },
        colors: ['red', 'green'],
        legend: {
            position: 'none'
        }
    };
    var chart = new google.charts.Bar(document.getElementById('oiChart'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
}

function getData(jsonData) {
    return new Promise((resolve, reject) => {
        let currentTs = (new Date()).getTime();
        if (optionChainData != null) {
            resolve(optionChainData);
        } else {
            fetch(jsonData + '?ts=' + currentTs, {
                    cache: "no-store"
                })
                .then(resp => {
                    if (resp.status != 200) throw new Error('something went wrong');
                    return resp.json();
                })
                .then(data => {
                    optionChainData = data;
                    lastUpdated = data.records.timestamp;
                    resolve(optionChainData);
                })
                .catch(err => {
                    reject('error');
                })
        }
    });
}

function init(conf) {
    getData(conf.data).then(function (data) {
        expiryDates = data.records.expiryDates;
        underlyingValue = data.records.underlyingValue;
        selected_expiry = data.records.expiryDates[0];
        let context = generateContext();
        if (conf.type == 'OI') {
            drawOIChart(context);
        } else if (conf.type == 'OIChg') {
            drawOIChgChart(context);
        } else if (conf.type == 'table') {
            fillExpiryDate(expiryDates);
            document.querySelector('#expiryDate').value = selected_expiry;
            renderTbl(context);
        }
    })
}

function generateContext() {
    let expiryDate = selected_expiry;
    let optionRange = 500;
    let option_chain = optionChainData.records.data.filter(c => {
        return (
                c.strikePrice <= optionRange + (parseInt(underlyingValue / 100) * 100)) &&
            (c.strikePrice >= (parseInt(underlyingValue / 100) * 100) - optionRange) &&
            c.expiryDate == expiryDate
    });

    option_chain = JSON.parse(JSON.stringify(option_chain)).map(optionChainAnalysis);

    let context = {
        option_chain,
        lastUpdated,
        underlyingValue,
        selected_expiry
    };

    console.log(context);
    return context;
}

function fillExpiryDate(expiryDates) {
    let expirySelect = document.querySelector('#expiryDate');
    expirySelect.innerHTML = expiryDates.map((c, idx) => {
        return `<option value="${c}">${c}</option>`;
    });
}

function optionChainAnalysis(strike) {
    strike.CE.change = strike.CE.change ? strike.CE.change.toFixed(1) : '';
    strike.PE.change = strike.PE.change ? strike.PE.change.toFixed(1) : '';

    strike.PE.openInterest = String(strike.PE.openInterest).replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
    strike.CE.openInterest = String(strike.CE.openInterest).replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
    strike.PE.totalTradedVolume = String(strike.PE.totalTradedVolume).replace(/(\d)(?=(\d\d)+\d$)/g,
        "$1,");
    strike.CE.totalTradedVolume = String(strike.CE.totalTradedVolume).replace(/(\d)(?=(\d\d)+\d$)/g,
        "$1,");

    strike.CE_A = {};
    strike.PE_A = {};

    strike.CE_A.price = strike.CE.change > 0 ? 1 : 0;
    strike.CE_A.OI = strike.CE.changeinOpenInterest > 0 ? 1 : 0;

    strike.PE_A.price = strike.PE.change > 0 ? 1 : 0;
    strike.PE_A.OI = strike.PE.changeinOpenInterest > 0 ? 1 : 0;

    if (strike.CE_A.price === 0 && strike.CE_A.OI === 0) strike.CE_A.i = 'Long Liquidation';
    else if (strike.CE_A.price === 0 && strike.CE_A.OI === 1) strike.CE_A.i = 'Short Buildup';
    else if (strike.CE_A.price === 1 && strike.CE_A.OI === 1) strike.CE_A.i = 'Short Covering';
    else if (strike.CE_A.price === 1 && strike.CE_A.OI === 0) strike.CE_A.i = 'Long Buildup';

    if (strike.PE_A.price === 0 && strike.PE_A.OI === 0) strike.PE_A.i = 'Long Liquidation';
    else if (strike.PE_A.price === 0 && strike.PE_A.OI === 1) strike.PE_A.i = 'Short Buildup';
    else if (strike.PE_A.price === 1 && strike.PE_A.OI === 1) strike.PE_A.i = 'Short Covering';
    else if (strike.PE_A.price === 1 && strike.PE_A.OI === 0) strike.PE_A.i = 'Long Buildup';

    strike.PE_A.trend = (strike.PE_A.i == 'Long Liquidation' || strike.PE_A.i == 'Short Buildup') ?
        0 : 1;
    strike.CE_A.trend = (strike.CE_A.i == 'Long Liquidation' || strike.CE_A.i == 'Short Buildup') ?
        1 : 0;

    return strike;
}

function renderTbl(context) {
    var source = document.getElementById("chain").innerHTML;
    var template = Handlebars.compile(source);
    document.getElementById('content').innerHTML = template(context);
}