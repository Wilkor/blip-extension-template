<?php
// Proxy CORS em PHP para a Hostinger
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-MCP-Transport");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$url = isset($_GET['url']) ? $_GET['url'] : '';
if (empty($url)) {
    http_response_code(400);
    echo json_encode(["error" => "Parâmetro URL não fornecido"]);
    exit();
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Repassa os cabeçalhos de autenticação e conteúdo
$requestHeaders = [];
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];

foreach ($incomingHeaders as $name => $value) {
    $lowerName = strtolower($name);
    if (in_array($lowerName, ['content-type', 'authorization', 'x-mcp-transport'])) {
        $requestHeaders[] = "$name: $value";
    }
}

if (!empty($requestHeaders)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $requestHeaders);
}

// Repassa o corpo da requisição em chamadas POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(["error" => "Erro na comunicação via cURL: " . $error]);
    exit();
}

http_response_code($httpCode > 0 ? $httpCode : 200);
header("Content-Type: application/json; charset=utf-8");
echo $response;
?>
