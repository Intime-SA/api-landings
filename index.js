const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de CORS para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de dominios permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', 
      'http://localhost:3003',
      
      'https://one.invertimeonline.com',
      'https://two.invertimeonline.com',
      'https://three.invertimeonline.com',
      'https://four.invertimeonline.com',

      'https://one.invertimeonline.com/',
      'https://two.invertimeonline.com/',
      'https://three.invertimeonline.com/',
      'https://four.invertimeonline.com/',
    ];
    
    // Agregar dominios desde variables de entorno
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    // Permitir requests sin origin (como Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está permitido
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origin:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware CORS
app.use(cors(corsOptions));

// Middleware para analizar JSON
app.use(bodyParser.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta para la página de prueba
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// Endpoint para enviar eventos a la API de Conversiones
app.post('/send-event', async (req, res) => {
  try {
    const { eventData, accessToken, pixelId } = req.body;

    // Validar datos entrantes
    if (!eventData || !eventData.event_name || !eventData.event_time || !eventData.user_data) {
      return res.status(400).json({ error: 'Datos del evento incompletos' });
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Access Token requerido' });
    }

    if (!pixelId) {
      return res.status(400).json({ error: 'Pixel ID requerido' });
    }

    // Configuración del payload
    const payload = {
      data: [
        {
          event_name: eventData.event_name,
          event_time: eventData.event_time,
          action_source: eventData.action_source || 'website',
          user_data: {
            em: eventData.user_data.em || [],
            ph: eventData.user_data.ph || [],
          },
          attribution_data: eventData.attribution_data || {
            attribution_share: "0.3"
          },
          custom_data: eventData.custom_data || {},
          original_event_data: eventData.original_event_data || {
            event_name: eventData.event_name,
            event_time: eventData.event_time
          }
        },
      ],
    };

    console.log('Enviando evento:', {
      event_name: eventData.event_name,
      pixel_id: pixelId,
      timestamp: new Date().toISOString()
    });

    // Llamada a la API de Conversiones
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${pixelId}/events`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          access_token: accessToken,
        },
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Evento enviado correctamente',
      response: response.data 
    });
  } catch (error) {
    console.error('Error enviando evento:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error enviando el evento', 
      details: error.response?.data || error.message 
    });
  }
});

// Endpoint de prueba para simular un evento de compra
app.post('/test-purchase', async (req, res) => {
  try {
    const { accessToken, pixelId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access Token requerido' });
    }

    if (!pixelId) {
      return res.status(400).json({ error: 'Pixel ID requerido' });
    }

    const testPayload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: [
              "7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"
            ],
            ph: [
              null
            ]
          },
          attribution_data: {
            attribution_share: "0.3"
          },
          custom_data: {
            currency: "USD",
            value: "1"
          },
          original_event_data: {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000)
          }
        }
      ]
    };

    console.log('Enviando evento de prueba Purchase:', {
      pixel_id: pixelId,
      timestamp: new Date().toISOString()
    });

    // Llamada a la API de Conversiones
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${pixelId}/events`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          access_token: accessToken,
        },
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Evento de prueba Purchase enviado correctamente',
      response: response.data 
    });
  } catch (error) {
    console.error('Error en evento de prueba:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error enviando el evento de prueba', 
      details: error.response?.data || error.message 
    });
  }
});

// Endpoint para simular un evento de PageView
app.post('/test-pageview', async (req, res) => {
  try {
    const { accessToken, pixelId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access Token requerido' });
    }

    if (!pixelId) {
      return res.status(400).json({ error: 'Pixel ID requerido' });
    }

    const testPayload = {
      data: [
        {
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: [
              "7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"
            ],
            ph: [
              null
            ]
          },
          custom_data: {
            content_name: "Página Principal",
            content_category: "Homepage",
            content_type: "product"
          },
          original_event_data: {
            event_name: "PageView",
            event_time: Math.floor(Date.now() / 1000)
          }
        }
      ]
    };

    console.log('Enviando evento PageView:', {
      pixel_id: pixelId,
      timestamp: new Date().toISOString()
    });

    // Llamada a la API de Conversiones
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${pixelId}/events`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          access_token: accessToken,
        },
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Evento PageView enviado correctamente',
      response: response.data 
    });
  } catch (error) {
    console.error('Error en evento PageView:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error enviando el evento PageView', 
      details: error.response?.data || error.message 
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Servicio de conversiones Facebook - Listo para recibir eventos');
});
