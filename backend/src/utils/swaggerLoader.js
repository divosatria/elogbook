const fs = require('fs');
const path = require('path');

/**
 * Secure YAML loader that validates content before parsing
 */
const loadSwaggerYAML = (filePath) => {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic validation - ensure it's a valid YAML structure
    if (!content.trim().startsWith('openapi:')) {
      throw new Error('Invalid OpenAPI specification');
    }
    
    // Use safe YAML parsing
    const YAML = require('yamljs');
    const document = YAML.parse(content);
    
    // Validate required OpenAPI fields
    if (!document.openapi || !document.info || !document.paths) {
      throw new Error('Invalid OpenAPI document structure');
    }
    
    return document;
  } catch (error) {
    console.error('Error loading Swagger YAML:', error.message);
    throw error;
  }
};

module.exports = { loadSwaggerYAML };