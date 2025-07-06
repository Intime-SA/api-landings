const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { ObjectId } = require('mongodb');

// Importar configuración de MongoDB
const { getCasinosDB, getCollection } = require('./lib/mongodb');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de CORS para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de dominios permitidos
    const allowedOrigins = [
      // local
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      
       // nico
      'https://one.spazioserver.app',
      'https://two.spazioserver.app',
      'https://three.spazioserver.app',
      'https://four.spazioserver.app',
      'https://five.spazioserver.app',
      'https://six.spazioserver.app',
      'https://seven.spazioserver.app',
      'https://eigth.spazioserver.app',

      // eze
      'https://one.mooneymaker.club',
      'https://three.mooneymaker.club',
      'https://register.mooneymaker.club',

      // guty
      'https://two.mooneymaker.club',
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

// Endpoint de prueba para verificar conexión a MongoDB
app.get('/api/health', async (req, res) => {
  try {
    const db = await getCasinosDB();
    const collections = await db.listCollections().toArray();
    
    res.status(200).json({ 
      success: true, 
      message: 'Conexión a MongoDB exitosa',
      database: 'casinos',
      collections: collections.map(col => col.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    res.status(500).json({ 
      error: 'Error conectando a MongoDB', 
      details: error.message 
    });
  }
});

// Endpoint para guardar eventos en MongoDB
app.post('/api/events', async (req, res) => {
  try {
    const { eventData, accessToken, pixelId } = req.body;

    // Validar datos entrantes
    if (!eventData || !eventData.event_name || !eventData.event_time || !eventData.user_data) {
      return res.status(400).json({ error: 'Datos del evento incompletos' });
    }

    // Obtener colección de eventos
    const eventsCollection = await getCollection('events');

    // Crear documento del evento
    const eventDocument = {
      event_name: eventData.event_name,
      event_time: eventData.event_time,
      action_source: eventData.action_source || 'website',
      user_data: eventData.user_data,
      attribution_data: eventData.attribution_data || {
        attribution_share: "0.3"
      },
      custom_data: eventData.custom_data || {},
      original_event_data: eventData.original_event_data || {
        event_name: eventData.event_name,
        event_time: eventData.event_time
      },
      pixel_id: pixelId,
      access_token: accessToken ? '***' : null, // No guardar el token real
      created_at: new Date(),
      status: 'pending' // pending, sent, failed
    };

    // Guardar en MongoDB
    const result = await eventsCollection.insertOne(eventDocument);

    console.log('Evento guardado en MongoDB:', {
      event_name: eventData.event_name,
      _id: result.insertedId,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ 
      success: true, 
      message: 'Evento guardado en MongoDB',
      event_id: result.insertedId
    });
  } catch (error) {
    console.error('Error guardando evento en MongoDB:', error);
    res.status(500).json({ 
      error: 'Error guardando el evento', 
      details: error.message 
    });
  }
});

// Endpoint para obtener eventos desde MongoDB
app.get('/api/events', async (req, res) => {
  try {
    const { limit = 10, page = 1, status, visit_uid } = req.query;
    
    const eventsCollection = await getCollection('events');
    
    // Construir filtro
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (visit_uid) {
      filter.visit_uid = visit_uid;
    }
    
    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtener eventos
    const events = await eventsCollection
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Contar total de eventos
    const total = await eventsCollection.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ 
      error: 'Error obteniendo eventos', 
      details: error.message 
    });
  }
});

// Endpoint para obtener eventos desde MongoDB
app.get('/api/pages', async (req, res) => {
  try {
    const { limit = 10, page = 1, status} = req.query;
    
    const pagesCollection = await getCollection('data-pages');
    
    // Construir filtro
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtener eventos
    const pages = await pagesCollection
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Contar total de eventos
    const total = await pagesCollection.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      pages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo páginas:', error);
    res.status(500).json({ 
      error: 'Error obteniendo páginas', 
      details: error.message 
    });
  }
});

// Endpoint para tracking de usuarios
app.post('/send-event/tracking', async (req, res) => {
  try {
    const { trackingData, events, access_token, pixel_id } = req.body;
    console.log('Datos de tracking recibidos:', req.body);

    // Validar datos entrantes
    if (!trackingData) {
      return res.status(400).json({ error: 'Datos de tracking requeridos' });
    }

    // Obtener colección data-users
    const userDataCollection = await getCollection('data-users');
    // Obtener colección data-pages
    const pagesCollection = await getCollection('data-pages');

    console.log('Datos de tracking recibidos:', req.body);

    console.log('Tracking data:', trackingData);

    // Buscar landing asociada por access_token o pixel_id
    let landing = null;
    if (access_token || pixel_id) {
      landing = await pagesCollection.findOne({
        $or: [
          access_token ? { access_token } : {},
          pixel_id ? { pixel_id } : {}
        ]
      });
    }

    console.log('Landing encontrado:', landing);

    let localidad = null;
    if (trackingData.ipAddress) {
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${trackingData.ipAddress}`);
        localidad = geoRes.data; // puedes filtrar solo lo que te interese
      } catch (e) {
        console.warn('No se pudo obtener la localidad:', e.message);
      }
    }

    // Crear documento de tracking
    const trackingDocument = {
      trackingData: {
        ...trackingData
      },
      events: events || [],
      access_token: access_token || null,
      pixel_id: pixel_id || null,
      page_id: landing ? landing._id : null,
      visit_uid: trackingData.visitUid || null,
      localidad: localidad,
      created_at: new Date(),
      updated_at: new Date(),
      status: 'active'
    };

    // Guardar en MongoDB
    const result = await userDataCollection.insertOne(trackingDocument);

    console.log('Datos de tracking guardados exitosamente:', {
      sessionId: trackingData.sessionId,
      visitUid: trackingData.visitUid,
      _id: result.insertedId,
      page_id: trackingDocument.page_id,
      events_count: events ? events.length : 0,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Datos de tracking guardados correctamente',
      tracking_id: result.insertedId,
      session_id: trackingData.sessionId,
      visit_uid: trackingData.visitUid,
      page_id: trackingDocument.page_id
    });

  } catch (error) {
    console.error('Error guardando datos de tracking:', error);
    res.status(500).json({
      error: 'Error guardando los datos de tracking',
      details: error.message
    });
  }
});

// Endpoint para obtener datos de tracking
app.get('/api/tracking', async (req, res) => {
  try {
    const { limit = 10, page = 1, sessionId, status, visit_uid } = req.query;
    
    const userDataCollection = await getCollection('data-users');
    
    // Construir filtro
    const filter = {};
    if (sessionId) {
      filter['trackingData.sessionId'] = sessionId;
    }
    if (status) {
      filter.status = status;
    }
    if (visit_uid) {
      filter.visit_uid = visit_uid;
    }
    
    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Obtener datos de tracking
    const trackingData = await userDataCollection
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Contar total de registros
    const total = await userDataCollection.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      tracking_data: trackingData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo datos de tracking:', error);
    res.status(500).json({ 
      error: 'Error obteniendo datos de tracking', 
      details: error.message 
    });
  }
});

// Endpoint para obtener datos completos por visit_uid (eventos + tracking)
app.get('/api/visit/:visitUid', async (req, res) => {
  try {
    const { visitUid } = req.params;
    
    if (!visitUid) {
      return res.status(400).json({ error: 'visit_uid requerido' });
    }
    
    const eventsCollection = await getCollection('events');
    const userDataCollection = await getCollection('data-users');
    
    // Obtener eventos por visit_uid
    const events = await eventsCollection
      .find({ visit_uid: visitUid })
      .sort({ created_at: -1 })
      .toArray();
    
    // Obtener datos de tracking por visit_uid
    const trackingData = await userDataCollection
      .find({ visit_uid: visitUid })
      .sort({ created_at: -1 })
      .toArray();
    
    res.status(200).json({
      success: true,
      visit_uid: visitUid,
      events: events,
      tracking_data: trackingData,
      summary: {
        total_events: events.length,
        total_tracking_sessions: trackingData.length,
        events_by_status: events.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {}),
        event_types: events.reduce((acc, event) => {
          acc[event.event_name] = (acc[event.event_name] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error obteniendo datos por visit_uid:', error);
    res.status(500).json({ 
      error: 'Error obteniendo datos por visit_uid', 
      details: error.message 
    });
  }
});

// Endpoint para enviar eventos a la API de Conversiones
app.post('/send-event', async (req, res) => {
  try {
    const { eventData, accessToken, pixelId, visitUid } = req.body;
    console.log('Datos recibidos:', req.body);

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

    // Preparar custom_data con visit_uid
    const customData = {
      value: parseFloat(eventData.custom_data?.value) || 0,
      currency: eventData.custom_data?.currency || "USD"
    };

    // Agregar visit_uid si está disponible (desde el body o desde custom_data)
    if (visitUid || eventData.custom_data?.visit_uid) {
      customData.visit_uid = visitUid || eventData.custom_data.visit_uid;
    }

    // Configuración del payload
    const payload = {
      data: [
        {
          event_name: eventData.event_name,
          event_id: eventData.event_id,
          event_time: eventData.event_time,
          action_source: eventData.action_source || 'website',
          user_data: {
            em: eventData.user_data.em || [],
            ph: eventData.user_data.ph || [],
            
          },
          attribution_data: eventData.attribution_data || {
            attribution_share: "0.3"
          },
          custom_data: customData,
          original_event_data: eventData.original_event_data || {
            event_name: eventData.event_name,
            event_time: eventData.event_time
          }
        },
      ],
    };

    // Asegurar que value sea un número válido
    if (eventData.custom_data && eventData.custom_data.value) {
      const numericValue = parseFloat(eventData.custom_data.value);
      if (!isNaN(numericValue)) {
        payload.data[0].custom_data.value = numericValue;
      }
    }

    console.log('Enviando evento:', {
      payload: JSON.stringify(payload, null, 2)
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

    console.log('Respuesta de la API de Conversiones:', response.data);

    // Guardar evento exitoso en MongoDB
    try {
      const eventsCollection = await getCollection('events');
      
      const eventDocument = {
        event_name: eventData.event_name,
        event_time: eventData.event_time,
        action_source: eventData.action_source || 'website',
        user_data: eventData.user_data,
        attribution_data: eventData.attribution_data || {
          attribution_share: "0.3"
        },
        custom_data: customData,
        original_event_data: eventData.original_event_data || {
          event_name: eventData.event_name,
          event_time: eventData.event_time
        },
        pixel_id: pixelId,
        access_token: '***',
        visit_uid: customData.visit_uid,
        created_at: new Date(),
        status: 'sent',
        facebook_response: response.data
      };

      const result = await eventsCollection.insertOne(eventDocument);
      
      console.log('Evento guardado exitosamente en MongoDB:', {
        event_name: eventData.event_name,
        _id: result.insertedId,
        visit_uid: customData.visit_uid,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Error guardando evento en DB:', dbError);
      // No fallar la respuesta principal si falla el guardado en DB
    }

    res.status(200).json({ 
      success: true, 
      message: 'Evento enviado correctamente',
      response: response.data,
      visit_uid: customData.visit_uid
    });
  } catch (error) {
    console.error('Error enviando evento:', error.response?.data || error.message);
    
    // Guardar evento fallido en MongoDB
    try {
      const eventsCollection = await getCollection('events');
      
      const customData = {
        value: parseFloat(req.body.eventData?.custom_data?.value) || 0,
        currency: req.body.eventData?.custom_data?.currency || "USD"
      };

      if (req.body.visitUid || req.body.eventData?.custom_data?.visit_uid) {
        customData.visit_uid = req.body.visitUid || req.body.eventData?.custom_data?.visit_uid;
      }
      
      const failedEventDocument = {
        event_name: req.body.eventData?.event_name,
        event_time: req.body.eventData?.event_time,
        action_source: req.body.eventData?.action_source || 'website',
        user_data: req.body.eventData?.user_data,
        attribution_data: req.body.eventData?.attribution_data || {
          attribution_share: "0.3"
        },
        custom_data: customData,
        original_event_data: req.body.eventData?.original_event_data || {
          event_name: req.body.eventData?.event_name,
          event_time: req.body.eventData?.event_time
        },
        pixel_id: req.body.pixelId,
        access_token: '***',
        visit_uid: customData.visit_uid,
        created_at: new Date(),
        status: 'failed',
        error_details: error.response?.data || error.message
      };

      const result = await eventsCollection.insertOne(failedEventDocument);
      
      console.log('Evento fallido guardado en MongoDB:', {
        event_name: req.body.eventData?.event_name,
        _id: result.insertedId,
        visit_uid: customData.visit_uid,
        status: 'failed',
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Error guardando evento fallido en DB:', dbError);
    }
    
    res.status(500).json({ 
      error: 'Error enviando el evento', 
      details: error.response?.data || error.message 
    });
  }
});

// Endpoint para KPIs globales
app.get('/api/kpis', async (req, res) => {
  try {
    const { from, to, pageId } = req.query;
    console.log('--- INICIO /api/kpis ---');
    console.log('Params:', { from, to, pageId });
    if (!from || !to || !pageId) {
      console.log('Faltan parámetros');
      return res.status(400).json({ error: 'Parámetros from, to y pageId requeridos' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffMs = toDate - fromDate;
    const prevFrom = new Date(fromDate.getTime() - diffMs);
    const prevTo = new Date(fromDate.getTime());
    console.log('Fechas:', { fromDate, toDate, prevFrom, prevTo });

    let pageObjectId;
    try {
      pageObjectId = new ObjectId(pageId);
    } catch (e) {
      console.log('Error convirtiendo pageId a ObjectId:', e);
      return res.status(400).json({ error: 'pageId inválido' });
    }

    const userDataCollection = await getCollection('data-users');
    const eventsCollection = await getCollection('events');
    console.log(userDataCollection, 'userDataCollection')
    console.log(eventsCollection, 'eventsCollection')
    console.log('Colecciones obtenidas');

    // --- FUNCIONES AUXILIARES ---
    const getTracking = async (start, end) => {
      const filtro = {
        page_id: pageObjectId,
        created_at: { $gte: start, $lte: end }
      };
      console.log('Filtro tracking:', filtro);
      const arr = await userDataCollection.find(filtro).toArray();
      console.log(`Tracking encontrados (${start.toISOString()} - ${end.toISOString()}):`, arr.length);
      return arr;
    };
    const getEvents = async (start, end) => {
      const filtro = {
        created_at: { $gte: start, $lte: end },
        event_name: 'Purchase'
      };
      console.log('Filtro events:', filtro);
      const arr = await eventsCollection.find(filtro).toArray();
      console.log(`Events encontrados (${start.toISOString()} - ${end.toISOString()}):`, arr.length);
      return arr;
    };

    // --- DATOS ACTUALES ---
    const tracking = await getTracking(fromDate, toDate);
    const events = await getEvents(fromDate, toDate);
    console.log('Tracking actual:', tracking.map(t => t.visit_uid));
    console.log('Events actual:', events.map(e => e.visit_uid));
    console.log('Ejemplo tracking:', tracking.slice(0, 3));
    console.log('Ejemplo events:', events.slice(0, 3));

    // --- DATOS PERÍODO ANTERIOR ---
    const trackingPrev = await getTracking(prevFrom, prevTo);
    const eventsPrev = await getEvents(prevFrom, prevTo);
    console.log('Tracking previo:', trackingPrev.map(t => t.visit_uid));
    console.log('Events previo:', eventsPrev.map(e => e.visit_uid));

    // --- KPIs ACTUALES ---
    const visitantesTotales = tracking.length;
    const tiempoPromedio = visitantesTotales > 0 ? Math.round(tracking.reduce((acc, t) => acc + (t.trackingData.totalActiveTime || 0), 0) / visitantesTotales) : 0;
    const uidsTracking = new Set(tracking.map(t => t.visit_uid));
    const uidsPurchase = new Set(events.map(e => e.visit_uid));
    const conversion = visitantesTotales > 0 ? (Array.from(uidsPurchase).filter(uid => uidsTracking.has(uid)).length / visitantesTotales) * 100 : 0;
    const registrosCasino = 0;
    console.log('KPIs actuales:', { visitantesTotales, tiempoPromedio, uidsTracking: Array.from(uidsTracking), uidsPurchase: Array.from(uidsPurchase), conversion, registrosCasino });

    // --- KPIs ANTERIORES ---
    const visitantesTotalesPrev = trackingPrev.length;
    const tiempoPromedioPrev = visitantesTotalesPrev > 0 ? Math.round(trackingPrev.reduce((acc, t) => acc + (t.trackingData.totalActiveTime || 0), 0) / visitantesTotalesPrev) : 0;
    const uidsTrackingPrev = new Set(trackingPrev.map(t => t.visit_uid));
    const uidsPurchasePrev = new Set(eventsPrev.map(e => e.visit_uid));
    const conversionPrev = visitantesTotalesPrev > 0 ? (Array.from(uidsPurchasePrev).filter(uid => uidsTrackingPrev.has(uid)).length / visitantesTotalesPrev) * 100 : 0;
    const registrosCasinoPrev = 0;
    console.log('KPIs previos:', { visitantesTotalesPrev, tiempoPromedioPrev, uidsTrackingPrev: Array.from(uidsTrackingPrev), uidsPurchasePrev: Array.from(uidsPurchasePrev), conversionPrev, registrosCasinoPrev });

    function calcVar(actual, previo) {
      if (previo === 0) return actual === 0 ? 0 : 100;
      return ((actual - previo) / previo) * 100;
    }

    const respuesta = {
      visitantesTotales: {
        valor: visitantesTotales,
        variacion: calcVar(visitantesTotales, visitantesTotalesPrev)
      },
      tiempoPromedio: {
        valor: tiempoPromedio, // en segundos
        variacion: calcVar(tiempoPromedio, tiempoPromedioPrev)
      },
      tasaConversion: {
        valor: parseFloat(conversion.toFixed(2)),
        variacion: calcVar(conversion, conversionPrev)
      },
      registrosCasino: {
        valor: registrosCasino,
        variacion: calcVar(registrosCasino, registrosCasinoPrev)
      },
      periodo: {
        actual: { from, to },
        anterior: { from: prevFrom.toISOString(), to: prevTo.toISOString() }
      }
    };
    console.log('Respuesta final:', respuesta);
    res.json(respuesta);
  } catch (error) {
    console.error('Error calculando KPIs:', error);
    res.status(500).json({ error: 'Error calculando KPIs', details: error.message });
  }
});

// Endpoint para guardar el inicio de la visita (init-tracking)
app.post('/send-event/init-tracking', async (req, res) => {
  try {
    const { access_token, pixel_id, visitUid } = req.body;

     if (!visitUid || !access_token || !pixel_id) {
      return res.status(400).json({ error: 'Faltan datos obligatorios: visitUid, sessionId, page_id, timestamp' });
    }
    const initTrackingCollection = await getCollection('init-tracking');
    const doc = {
      visitUid,
      pixel_id: pixel_id || null,
      access_token: access_token || null,
      created_at: new Date(),
      status: 'init'
    };
    const result = await initTrackingCollection.insertOne(doc);
    res.status(201).json({ success: true, message: 'Init tracking guardado', _id: result.insertedId, visitUid });
  } catch (error) {
    console.error('Error en /api/init-tracking:', error);
    res.status(500).json({ error: 'Error guardando init tracking', details: error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Servicio de conversiones Facebook - Listo para recibir eventos');
});
