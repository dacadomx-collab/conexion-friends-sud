<?php
declare(strict_types=1);

// -----------------------------------------------------------------------------
// CORS DINÁMICO — Whitelist explícita de orígenes permitidos.
// El Origin del cliente se compara contra la lista; nunca se refleja ciegamente.
// -----------------------------------------------------------------------------
$allowedOrigins = [
    'https://friends.tecnidepot.com',
    'http://localhost:3000',
    'http://localhost:3001',
];

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin    = in_array($requestOrigin, $allowedOrigins, true)
    ? $requestOrigin
    : 'https://friends.tecnidepot.com';

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: '  . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

class Database {
    private string $host;
    private string $db_name;
    private string $username;
    private string $password;
    public ?PDO $conn = null;

    public function __construct() {
        $env = $this->loadEnv(__DIR__ . '/../.env');

        $this->host     = (string)($env['DB_HOST'] ?? 'localhost');
        $this->db_name  = (string)($env['DB_NAME'] ?? 'tecnidepot_conexion_friends');
        $this->username = (string)($env['DB_USER'] ?? 'tecnidepot_conexion_user_db');
        $this->password = (string)($env['DB_PASS'] ?? '');
    }

    private function jsonError(string $message, int $httpCode = 500): void {
        http_response_code($httpCode);
        echo json_encode(["status" => "error", "message" => $message]);
        exit;
    }

    private function loadEnv(string $path): array {
        // Único archivo de entorno: .env en la raíz del proyecto (un nivel arriba de /api/)
        if (!is_readable($path)) {
            $this->jsonError("Archivo .env no encontrado. Verifica el despliegue en el servidor.");
        }

        $data = parse_ini_file($path, false, INI_SCANNER_RAW);
        if ($data === false) {
            $this->jsonError("No se pudo leer el archivo .env. Revisa el formato.");
        }

        return $data;
    }

    public function getConnection(): PDO {
        if ($this->db_name === "" || $this->username === "") {
            echo json_encode(["status" => "error", "message" => "Error de BD: credenciales incompletas en .env"]);
            exit;
        }

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            $this->conn->exec("set names utf8mb4");
        } catch (PDOException $exception) {
            $errorInfo = $exception->errorInfo ?? [];
            $driverCode = $errorInfo[1] ?? null;
            if ($driverCode === 1045) {
                echo json_encode(["status" => "error", "message" => "Acceso denegado a BD. Revisa credenciales en .env"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Error de BD: " . $exception->getMessage()]);
            }
            exit;
        }

        return $this->conn;
    }
}
