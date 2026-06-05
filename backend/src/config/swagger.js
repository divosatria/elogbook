const swaggerUi = require('swagger-ui-express');
const path = require('path');
const os = require('os');
const { validateHost, safeCompare } = require('../utils/security');
const { loadSwaggerYAML } = require('../utils/swaggerLoader');

const swaggerSetup = (app) => {
  try {
    const swaggerDocument = loadSwaggerYAML(path.join(__dirname, '../../swagger.yaml'));
    
    // Swagger access control middleware with enhanced security
    const swaggerAccessControl = (req, res, next) => {
      if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_PUBLIC === 'true') {
        return next();
      }

      // If basic auth credentials are configured, require them
      const user = process.env.SWAGGER_BASIC_USER;
      const pass = process.env.SWAGGER_BASIC_PASS;

      if (!user || !pass) {
        // Not configured for production - deny access
        return res.status(403).send('Swagger UI is disabled in production. Set SWAGGER_PUBLIC=true or configure SWAGGER_BASIC_USER/SWAGGER_BASIC_PASS to enable.');
      }

      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        return res.status(401).send('Authentication required');
      }

      const encoded = auth.replace('Basic ', '');
      let decoded = '';
      try {
        // Validate base64 encoding before decoding
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
          throw new Error('Invalid base64 format');
        }
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
      } catch (e) {
        console.warn('Invalid authentication attempt:', e.message);
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        return res.status(401).send('Invalid authentication');
      }

      const credentials = decoded.split(':');
      if (credentials.length !== 2) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
        return res.status(401).send('Invalid credentials format');
      }
      
      const [providedUser, providedPass] = credentials;
      if (safeCompare(providedUser, user) && safeCompare(providedPass, pass)) {
        return next();
      }

      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      return res.status(401).send('Invalid credentials');
    };

    // Enhanced security headers for Swagger UI
    app.use('/api-docs', swaggerAccessControl, (req, res, next) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      // Enhanced Content Security Policy for Swagger UI
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Swagger UI requires inline scripts
        "style-src 'self' 'unsafe-inline'", // Swagger UI requires inline styles
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' http: https: ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      res.setHeader('Content-Security-Policy', cspDirectives);
      
      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    }, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customSiteTitle: "E-Logbook API Documentation",
      // Small custom CSS to improve readability (colors, fonts, spacing)
      customCss: '.swagger-ui .topbar { background: linear-gradient(90deg,#0d6efd,#6610f2); } .swagger-ui .topbar .link span { color: #fff; font-weight:600 } .swagger-ui .info { font-size: 15px; line-height: 1.4 } .opblock-summary { font-weight: 600 } .parameter__name { font-weight: 600 } .opblock-description-wrapper { color: #333 }',
      customfavIcon: '/favicon-32x32.png',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: false,
        defaultModelsExpandDepth: -1,
        defaultModelExpandDepth: 1,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        validatorUrl: null,
        url: '/api-docs.json'
      }
    }));

    app.get('/api-docs.json', swaggerAccessControl, (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Validate and sanitize host header
      const protocol = req.protocol;
      const rawHost = req.get('host');
      const validHost = validateHost(rawHost);
      
      if (!validHost) {
        return res.status(400).json({ error: 'Invalid host header' });
      }
      
      // Create a safe copy of swagger document to prevent modification
      const dynamicDoc = JSON.parse(JSON.stringify({
        ...swaggerDocument,
        servers: [
          {
            url: `${protocol}://${validHost}/api`,
            description: 'Current server'
          }
        ]
      }));
      
      res.send(dynamicDoc);
    });

    app.get('/docs', (req, res) => {
      res.redirect('/api-docs');
    });

    // Display helpful access URLs including LAN addresses
    const port = process.env.PORT || 5000;
    const nets = os.networkInterfaces();
    const ips = [];
    Object.keys(nets).forEach((name) => {
      nets[name].forEach((net) => {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      });
    });

    console.log('\n📚 E-Logbook API Documentation');
    console.log(`🔗 Swagger UI (any interface): http://0.0.0.0:${port}/api-docs`);
    console.log(`📄 JSON Spec: http://0.0.0.0:${port}/api-docs.json`);
    if (ips.length > 0) {
      ips.forEach(ip => console.log(`🌐 LAN access: http://${ip}:${port}/api-docs`));
    } else {
      console.log('🌐 LAN access: (no non-internal IPv4 detected)');
    }
    console.log('\n✅ Features: Interactive testing, JWT auth, search filter\n');
  } catch (error) {
    console.error('❌ Error setting up Swagger:', error.message);
  }
};

module.exports = swaggerSetup;