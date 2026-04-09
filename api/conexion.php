<?php
declare(strict_types=1);

// -----------------------------------------------------------------------------
// CORS DINÁMICO — Whitelist cargada desde variable de entorno ALLOWED_ORIGINS
// (lista separada por comas) con fallback a valores seguros por defecto.
// El Origin del cliente NUNCA se refleja ciegamente — siempre se valida primero.
// -----------------------------------------------------------------------------
$envOrigins     = getenv('ALLOWED_ORIGINS') ?: '';
$allowedOrigins = array_filter(array_map('trim', explode(',', $envOrigins)));

// Fallback: si la variable de entorno no está configurada usamos la whitelist base.
if (empty($allowedOrigins)) {
    $allowedOrigins = [
        'https://friends.tecnidepot.com',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
}

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} else {
    // Origen no reconocido — devolvemos el dominio de producción como default.
    header('Access-Control-Allow-Origin: https://friends.tecnidepot.com');
    header('Vary: Origin');
}

// ── Intercepción Preflight (OPTIONS) ─────────────────────────────────────────
// Debe resolverse ANTES de cualquier lógica de aplicación o acceso a la BD.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');   // caché preflight 24 h → menos round-trips
    header('HTTP/1.1 200 OK');
    exit(0);
}

// Solo las peticiones reales (no OPTIONS) llevan Content-Type JSON.
header('Content-Type: application/json; charset=UTF-8');

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
