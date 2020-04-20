<?php

function getChain($instrument, $optionRange)
{
    $optionFileName = strtolower($instrument) . '.json';

    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => "http://www.nseindia.com/api/option-chain-indices?symbol=" . $instrument,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
        CURLOPT_HTTPHEADER => array(
            "Referer: https://www.nseindia.com/get-quotes/derivatives?symbol=" . $instrument . "&identifier=OPTIDX" . $instrument . "01-04-2020PE8000.00",
            "sec-fetch-mode: cors,",
            "sec-fetch-site: same-origin,",
            "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36,",
            "Accept-Encoding: gzip, deflate, br,",
            "Accept-Language: en-IN,en;q=0.9,en-GB;q=0.8,en-US;q=0.7,hi;q=0.6,mr;q=0.5,",
        ),
    ));

    $response = curl_exec($curl);

    curl_close($curl);

    $optionData = json_decode($response, true);
    unset($optionData['filtered']);
    unset($optionData['records']['strikePrices']);
    $underlyingValue = $optionData['records']['underlyingValue'];
    $removeExpiry = [];
    $i = 0;

    foreach ($optionData['records']['expiryDates'] as $key => $expiry) {
        $i++;
        if ($i > 5) {
            $removeExpiry[] = $expiry;
            unset($optionData['records']['expiryDates'][$key]);
        }
    }

    foreach ($optionData['records']['data'] as $key => $data) {
        if (array_search($data, $removeExpiry) != false) {
            unset($optionData['records']['data'][$key]);
        } else if ($data['strikePrice'] > ($underlyingValue + $optionRange) || $data['strikePrice'] < ($underlyingValue - $optionRange)) {
            unset($optionData['records']['data'][$key]);
        }
    }

    $optionData['records']['data'] = array_values($optionData['records']['data']);
    $optionData['records']['expiryDates'] = array_values($optionData['records']['expiryDates']);

    $optionFile = fopen($optionFileName, "w") or die("Unable to open file!");
    fwrite($optionFile, json_encode($optionData));
    fclose($optionFile);
}

echo "Nifty Downloading...\n";
getChain("NIFTY", 500);
echo "BankNifty Downloading...\n";
getChain("BANKNIFTY", 1500);
echo "Downloading Complete!\n";

// $ftp_server = "ftp.example.com";
// $ftp_conn = ftp_connect($ftp_server) or die("Could not connect to $ftp_server");
// $login = ftp_login($ftp_conn, $ftp_username, $ftp_userpass);
// $file = "localfile.txt";
// // upload file
// if (ftp_put($ftp_conn, "serverfile.txt", $file, FTP_ASCII)) {
//     echo "Successfully uploaded $file.";
// } else {
//     echo "Error uploading $file.";
// }
// // close connection
// ftp_close($ftp_conn);