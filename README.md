# API de Conversiones con MongoDB

API para manejo de eventos de conversiones de Facebook con integración a MongoDB.

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# MongoDB Configuration
MONGO_DB_URI=your_mongodb_connection_string_here

# Environment
NODE_ENV=development
```

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Configuración de MongoDB

Asegúrate de que tu string de conexión de MongoDB apunte a la base de datos `casinos`. El formato típico es:

```
mongodb+srv://username:password@cluster.mongodb.net/casinos?retryWrites=true&w=majority
```

## Endpoints Disponibles

### Health Check
- `GET /api/health` - Verifica la conexión a MongoDB

### Eventos
- `POST /api/events` - Guarda un evento en MongoDB
- `GET /api/events` - Obtiene eventos con paginación
  - Query params: `limit`, `page`, `status`

### Conversiones Facebook
- `POST /send-event` - Envía evento a Facebook y lo guarda en MongoDB

## Estructura de la Base de Datos

### Colección: `events`
```javascript
{
  event_name: String,
  event_time: Number,
  action_source: String,
  user_data: Object,
  attribution_data: Object,
  custom_data: Object,
  original_event_data: Object,
  pixel_id: String,
  access_token: String, // "***" para seguridad
  created_at: Date,
  status: String, // "pending", "sent", "failed"
  facebook_response: Object, // Solo para eventos enviados
  error_details: Object // Solo para eventos fallidos
}
```

## Uso

```bash
# Iniciar servidor
npm start

# El servidor estará disponible en http://localhost:3003
```

## Ejemplo de Uso

### Verificar conexión a MongoDB
```bash
curl http://localhost:3003/api/health
```

### Guardar evento
```bash
curl -X POST http://localhost:3003/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventData": {
      "event_name": "Purchase",
      "event_time": 1234567890,
      "user_data": {
        "em": ["user@example.com"],
        "ph": ["1234567890"]
      }
    },
    "pixelId": "your_pixel_id"
  }'
```
