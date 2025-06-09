// AFD Classes
class SerialNumberAFD {
    constructor() {
        this.alphabet = new Set(['S', 'N', '-', ...this.getLetters(), ...this.getDigits()]);
        this.states = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'qf'];
        this.initialState = 'q0';
        this.finalStates = new Set(['qf']);
        
        this.transitions = {
            'q0': { 'S': 'q1' },
            'q1': { 'N': 'q2' },
            'q2': { '-': 'q3' },
            'q3': {}, 'q4': {}, 'q5': {}, 'q6': {},
            'q7': { '-': 'q8' },
            'q8': {}, 'q9': {}, 'q10': {}, 'q11': {},
            'qf': {}
        };
        
        // Configurar transiciones para letras
        for (let letter of this.getLetters()) {
            this.transitions['q3'][letter] = 'q4';
            this.transitions['q4'][letter] = 'q5';
        }
        
        // Configurar transiciones para dígitos
        for (let digit of this.getDigits()) {
            this.transitions['q5'][digit] = 'q6';
            this.transitions['q6'][digit] = 'q7';
            this.transitions['q8'][digit] = 'q9';
            this.transitions['q9'][digit] = 'q10';
            this.transitions['q10'][digit] = 'q11';
            this.transitions['q11'][digit] = 'qf';
        }
    }
    
    getLetters() {
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    }
    
    getDigits() {
        return '0123456789'.split('');
    }
    
    isValidYearMonth(year, month) {
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        
        if (yearNum < 0 || yearNum > 99) return false;
        if (monthNum < 1 || monthNum > 12) return false;
        
        return true;
    }
    
    validate(input) {
        let currentState = this.initialState;
        let position = 0;
        
        // Validar estructura con el autómata
        for (let char of input) {
            position++;
            
            if (!this.alphabet.has(char)) {
                return {
                    valid: false,
                    error: `Carácter inválido '${char}' en posición ${position}`,
                    position: position
                };
            }
            
            if (this.transitions[currentState] && this.transitions[currentState][char]) {
                currentState = this.transitions[currentState][char];
            } else {
                return {
                    valid: false,
                    error: `Transición inválida desde estado '${currentState}' con carácter '${char}' en posición ${position}`,
                    position: position
                };
            }
        }
        
        // Verificar estado final
        if (!this.finalStates.has(currentState)) {
            return {
                valid: false,
                error: `Cadena incompleta, terminó en estado '${currentState}' en lugar de estado final`,
                position: position
            };
        }
        
        // Validar año y mes
        const parts = input.split('-');
        if (parts.length === 3) {
            const lastPart = parts[2];
            const yearPart = lastPart.slice(0, 2);
            const monthPart = lastPart.slice(2, 4);
            
            if (!this.isValidYearMonth(yearPart, monthPart)) {
                return {
                    valid: false,
                    error: `Fecha inválida: año ${yearPart} o mes ${monthPart} no son válidos. El mes debe estar entre 01-12`,
                    position: input.length
                };
            }
        }
        
        return { valid: true };
    }
}

class LicensePlateAFD {
    constructor() {
        this.alphabet = new Set(['-', ...this.getLetters(), ...this.getDigits()]);
        this.states = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'qf'];
        this.initialState = 'q0';
        this.finalStates = new Set(['qf']);
        
        this.transitions = {
            'q0': {}, 'q1': {}, 'q2': {},
            'q3': { '-': 'q4' },
            'q4': {}, 'q5': {}, 'q6': {}, 'q7': {},
            'q8': { '-': 'q9' },
            'q9': {},
            'qf': {}
        };
        
        // Configurar transiciones para letras
        for (let letter of this.getLetters()) {
            this.transitions['q0'][letter] = 'q1';
            this.transitions['q1'][letter] = 'q2';
            this.transitions['q2'][letter] = 'q3';
            this.transitions['q9'][letter] = 'qf';
        }
        
        // Configurar transiciones para dígitos
        for (let digit of this.getDigits()) {
            this.transitions['q4'][digit] = 'q5';
            this.transitions['q5'][digit] = 'q6';
            this.transitions['q6'][digit] = 'q7';
            this.transitions['q7'][digit] = 'q8';
        }
    }
    
    getLetters() {
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    }
    
    getDigits() {
        return '0123456789'.split('');
    }
    
    validate(input) {
        let currentState = this.initialState;
        let position = 0;
        
        for (let char of input) {
            position++;
            
            if (!this.alphabet.has(char)) {
                return {
                    valid: false,
                    error: `Carácter inválido '${char}' en posición ${position}`,
                    position: position
                };
            }
            
            if (this.transitions[currentState] && this.transitions[currentState][char]) {
                currentState = this.transitions[currentState][char];
            } else {
                return {
                    valid: false,
                    error: `Transición inválida desde estado '${currentState}' con carácter '${char}' en posición ${position}`,
                    position: position
                };
            }
        }
        
        if (this.finalStates.has(currentState)) {
            return { valid: true };
        } else {
            return {
                valid: false,
                error: `Cadena incompleta, terminó en estado '${currentState}' en lugar de estado final`,
                position: position
            };
        }
    }
}

class AFDValidator {
    constructor() {
        this.serialNumberAFD = new SerialNumberAFD();
        this.licensePlateAFD = new LicensePlateAFD();
    }
    
    // Para Node.js
    async readFile(filePath) {
        try {
            const fs = require('fs').promises;
            const content = await fs.readFile(filePath, 'utf8');
            return content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        } catch (error) {
            throw new Error(`Error al leer el archivo: ${error.message}`);
        }
    }
    
    // Para navegador
    readFileFromInput(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                resolve(lines);
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }
    
    detectType(input) {
        if (input.startsWith('SN-')) {
            return 'serial';
        } else if (input.match(/^[A-Z]{3}-\d{4}-[A-Z]$/)) {
            return 'license';
        }
        return 'unknown';
    }
    
    validateString(input) {
        const type = this.detectType(input);
        let result;
        
        switch (type) {
            case 'serial':
                result = this.serialNumberAFD.validate(input);
                result.type = 'Número de Serie';
                break;
            case 'license':
                result = this.licensePlateAFD.validate(input);
                result.type = 'Placa de Matrícula';
                break;
            default:
                result = {
                    valid: false,
                    error: 'Formato no reconocido',
                    type: 'Desconocido'
                };
        }
        
        result.input = input;
        return result;
    }
    
    validateMultiple(inputs) {
        const results = [];
        
        inputs.forEach((input, index) => {
            const result = this.validateString(input);
            result.lineNumber = index + 1;
            results.push(result);
        });
        
        return results;
    }
    
    async processFile(filePath) {
        try {
            const lines = await this.readFile(filePath);
            return this.validateMultiple(lines);
        } catch (error) {
            throw error;
        }
    }
    
    generateReport(results) {
        let report = "=== REPORTE DE VALIDACIÓN AFD ===\n\n";
        
        const validCount = results.filter(r => r.valid).length;
        const invalidCount = results.length - validCount;
        
        report += `Total de cadenas procesadas: ${results.length}\n`;
        report += `Cadenas válidas: ${validCount}\n`;
        report += `Cadenas inválidas: ${invalidCount}\n\n`;
        
        report += "=== RESULTADOS DETALLADOS ===\n";
        
        results.forEach(result => {
            report += `\nLínea ${result.lineNumber}: "${result.input}"\n`;
            report += `Tipo: ${result.type}\n`;
            report += `Estado: ${result.valid ? 'VÁLIDO' : 'INVÁLIDO'}\n`;
            
            if (!result.valid) {
                report += `Error: ${result.error}\n`;
                if (result.position) {
                    report += `Posición del error: ${result.position}\n`;
                }
            }
            report += "---\n";
        });
        
        return report;
    }
}



// Inicialización para diferentes entornos
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { AFDValidator, SerialNumberAFD, LicensePlateAFD };
    runExample();
}

if (typeof window !== 'undefined') {
    // Navegador
    window.AFDValidator = AFDValidator;
    window.SerialNumberAFD = SerialNumberAFD;
    window.LicensePlateAFD = LicensePlateAFD;
    
    // Inicialización DOM
    window.addEventListener('DOMContentLoaded', () => {
        const validateBtn = document.getElementById('validateBtn');
        const manualInput = document.getElementById('manualText');
        const fileInput = document.getElementById('fileInput');
        const resultsContainer = document.getElementById('results');
        const resultsList = document.getElementById('resultsList');
        const validCountSpan = document.getElementById('validCount');
        const invalidCountSpan = document.getElementById('invalidCount');

        if (!validateBtn) return; // Si no existe la interfaz, no hacer nada

        const validator = new AFDValidator();

        validateBtn.addEventListener('click', async () => {
            let lines = [];

            if (fileInput.files.length > 0) {
                try {
                    lines = await validator.readFileFromInput(fileInput.files[0]);
                } catch (error) {
                    alert("Error al leer el archivo: " + error.message);
                    return;
                }
            } else {
                lines = manualInput.value.split('\n').map(l => l.trim()).filter(l => l);
            }

            if (lines.length === 0) {
                alert("Por favor, ingrese texto o seleccione un archivo.");
                return;
            }

            const results = validator.validateMultiple(lines);

            // Mostrar resultados
            resultsList.innerHTML = '';
            let validCount = 0;
            let invalidCount = 0;

            results.forEach(res => {
                const div = document.createElement('div');
                div.classList.add('result-item');
                div.classList.add(res.valid ? 'valid' : 'invalid');

                div.innerHTML = `
                    <div class="result-header">
                        <i class="result-icon ${res.valid ? 'valid' : 'invalid'} fas fa-${res.valid ? 'check' : 'times'}-circle"></i>
                        <span class="result-line">Línea ${res.lineNumber}</span>
                    </div>
                    <div class="result-string">${res.input}</div>
                    <div class="result-message">${res.valid ? 'Cadena válida' : res.error}</div>
                `;
                resultsList.appendChild(div);

                if (res.valid) validCount++;
                else invalidCount++;
            });

            validCountSpan.textContent = `${validCount} válidas`;
            invalidCountSpan.textContent = `${invalidCount} inválidas`;
            resultsContainer.style.display = 'block';
        });
    });
}