class MazeSolver {
    constructor(universe) {
        this.universe = universe;
        this.solutionPath = null;
        this.pathLog = [];
        this.explorationCounter = 0;
        this.logLiveFrequency = 1000000; // Frecuencia para mostrar logs en vivo (cada N exploraciones)
    }

    solve() {
        const startFila = this.universe.origen[0];
        const startColumna = this.universe.origen[1];
        const initialCharge = this.universe.cargaInicialNave;

        // Initial mutable copies for the entire search process
        // Ensure agujerosGusano and agujerosNegros are arrays, even if undefined/null in universe
        const mutableWormholes = JSON.parse(JSON.stringify(this.universe.agujerosGusano || []));
        mutableWormholes.forEach(wh => wh.usado = wh.usado || false);

        const mutableBlackHoles = JSON.parse(JSON.stringify(this.universe.agujerosNegros || []));

        this.pathLog = [];
        this.solutionPath = null;
        this.explorationCounter = 0;

        const logMsgStart = `Iniciando búsqueda desde [${startFila}, ${startColumna}] con carga ${initialCharge}. Destino: [${this.universe.destino[0]}, ${this.universe.destino[1]}]`;
        console.log(logMsgStart);
        this.pathLog.push(logMsgStart);

        const initialPath = []; // Path will be built by mutating this array

        const found = this._findPathRecursive(
            startFila,
            startColumna,
            initialCharge,
            initialPath, // Pass by reference, will be mutated
            new Set(),   // visitedInCurrentPath
            mutableWormholes,
            mutableBlackHoles
        );

        if (found) {
            this.pathLog.push("Solución encontrada."); // Original: const sol_msg = "Solución encontrada."; this.pathLog.push(sol_msg);
            this.solutionPath.forEach((step, index) => {
                const logMsg = `Paso ${index}: Celda [${step.fila}, ${step.columna}], Carga restante: ${step.chargeAfterCell.toFixed(2)}, Acción: ${step.action}`;
                this.pathLog.push(logMsg);
            });
        } else {
            const noSolMsg = "No se encontró una solución válida después de explorar todos los caminos.";
            this.pathLog.push(noSolMsg);
            console.log(noSolMsg); // Original had this console log as well
        }
        return this.solutionPath;
    }

    _isValidCell(fila, columna) {
        return fila >= 0 && fila < this.universe.matriz.filas &&
               columna >= 0 && columna < this.universe.matriz.columnas;
    }

    /**
     * Recursively finds a path from the current cell to the destination.
     * @param {number} fila Current row
     * @param {number} columna Current column
     * @param {number} currentCharge Current charge of the ship
     * @param {Array<Object>} currentPath Path taken so far (mutated during recursion)
     * @param {Set<string>} visitedInCurrentPath Cells visited in the current path to avoid cycles
     * @param {Array<Object>} currentWormholes State of wormholes (mutated and reverted)
     * @param {Array<Object>} currentBlackHoles State of black holes (mutated and reverted)
     * @returns {boolean} True if a path is found, false otherwise
     */

    _findPathRecursive(fila, columna, currentCharge, currentPath, visitedInCurrentPath, currentWormholes, currentBlackHoles) {
        this.explorationCounter++;
        const cellKey = `${fila}-${columna}`;
        
        const exploringMsg = `Explorando [${fila},${columna}], Carga actual: ${currentCharge.toFixed(2)}`;
        // REMOVED: this.pathLog.push(exploringMsg); // Esta línea se eliminó para optimización de RAM
        if (this.explorationCounter % this.logLiveFrequency === 0) {
            console.log(`(Exploración #${this.explorationCounter}) ${exploringMsg}`);
        }

        // --- 1. Validaciones y Condiciones Base ---
        if (!this._isValidCell(fila, columna)) {
            this.pathLog.push(`Intento de ir a celda inválida [${fila},${columna}]. Abortando rama.`); // Preservado
            return false;
        }
        if (currentBlackHoles.some(bh => bh.fila === fila && bh.columna === columna)) {
            this.pathLog.push(`Celda [${fila},${columna}] es un agujero negro. Bloqueada.`); // Preservado
            return false;
        }
        if (visitedInCurrentPath.has(cellKey)) {
            this.pathLog.push(`Ciclo detectado en [${fila},${columna}]. Abortando rama.`); // Preservado
            return false;
        }
        
        let chargeAfterCell = currentCharge;
        const actionParts = []; // Para construir la descripción de la acción para el paso actual

        // --- 2. Aplicar costo/recarga de la celda actual y peajes ---
        const isRechargeZoneCell = this.universe.isRechargeZone(fila, columna);
        if (isRechargeZoneCell) {
            const rechargeData = this.universe.getRechargeZone(fila, columna);
            if (rechargeData) { // rechargeData podría ser nulo si de alguna manera no es una zona válida
                chargeAfterCell *= rechargeData.multiplicador;
                actionParts.push(`Zona Recarga x${rechargeData.multiplicador.toFixed(2)}`);
                this.pathLog.push(`Celda [${fila},${columna}] es Zona Recarga. Carga ahora: ${chargeAfterCell.toFixed(2)}`);
            }
        } else { // No es una zona de recarga, aplicar costo de celda estándar
            const cellEnergyCost = this.universe.matrizInicial[fila]?.[columna] ?? 0;
            if (cellEnergyCost > 0) { // Solo aplicar costo si es positivo, evitar cambiar la carga si el costo es 0
                chargeAfterCell -= cellEnergyCost;
                actionParts.push(`Costo celda: ${cellEnergyCost.toFixed(2)}`);
            }
        }

        // Si la carga es <=0 DESPUÉS del costo/recarga de la celda (y no es el destino), es un camino inválido.
        if (chargeAfterCell <= 0 && !(fila === this.universe.destino[0] && columna === this.universe.destino[1])) {
            this.pathLog.push(`Sin energía en [${fila},${columna}] tras costo de celda (Carga: ${chargeAfterCell.toFixed(2)}).`); // Preservado
            return false;
        }

        // Celda con carga requerida (peaje)
        const requiredChargeData = this.universe.getRequiredChargeCell(fila, columna);
        if (requiredChargeData?.coordenada) { // Verificar si existe coordenada, implicando datos válidos
            chargeAfterCell -= requiredChargeData.cargaGastada;
            actionParts.push(`Peaje Carga Req.: ${requiredChargeData.cargaGastada.toFixed(2)}`);
            if (chargeAfterCell <= 0 && !(fila === this.universe.destino[0] && columna === this.universe.destino[1])) {
                this.pathLog.push(`Sin energía tras peaje en [${fila},${columna}]. Abortando rama.`); // Preservado
                return false;
            }
        }
        
        // --- Añadir celda actual al camino y marcar como visitada ---
        visitedInCurrentPath.add(cellKey);
        const newStep = { fila, columna, chargeBeforeCell: currentCharge, chargeAfterCell, action: "" };
        currentPath.push(newStep); // newStep.action y chargeAfterCell podrían actualizarse más tarde por efectos

        // --- 3. Aplicar efectos que modifican el entorno (Estrella Gigante) ---
        let bhDestroyedInfo = null; // Para almacenar {bh, originalIndex} si se destruye un agujero negro

        if (this.universe.isGiantStar(fila, columna)) {
            let closestBHIdx = -1;
            let minDist = Infinity;
            currentBlackHoles.forEach((bh, idx) => {
                const dist = Math.abs(bh.fila - fila) + Math.abs(bh.columna - columna);
                if (dist < minDist) {
                    minDist = dist;
                    closestBHIdx = idx;
                }
            });
            if (closestBHIdx !== -1) {
                const destroyedBH = currentBlackHoles.splice(closestBHIdx, 1)[0];
                bhDestroyedInfo = { bh: destroyedBH, originalIndex: closestBHIdx };
                actionParts.push(`Estrella destruyó BH en [${destroyedBH.fila},${destroyedBH.columna}]`);
                this.pathLog.push(`Estrella en [${fila},${columna}] destruyó BH en [${destroyedBH.fila},${destroyedBH.columna}].`); // Preservado
            }
        }
        
        // Finalizar cadena de acción para el paso actual basado en los efectos hasta ahora
        // Esto se actualizará si se toma un agujero de gusano
        newStep.action = actionParts.length > 0 ? actionParts.join(", ") : "Mover";
        if (actionParts.length === 0 && isRechargeZoneCell && newStep.action === "Mover") { // Manejar zona de recarga neutral
             newStep.action = `Zona Recarga (neutral)`; // O específico si rechargeData fue neutral, ej. x1
        }
        newStep.chargeAfterCell = chargeAfterCell; // Actualizar carga en el objeto del paso, puede ser modificada por zona de recarga

        // --- 4. ¿Llegó al destino? ---
        if (fila === this.universe.destino[0] && columna === this.universe.destino[1]) {
            if (chargeAfterCell > 0) {
                this.solutionPath = [...currentPath]; // Guardar una *copia* del camino encontrado
                const destinationReachedMsg = `Destino [${fila},${columna}] alcanzado con carga ${chargeAfterCell.toFixed(2)}.`;
                this.pathLog.push(destinationReachedMsg); // Preservado
                console.log(destinationReachedMsg);     // Preservado
                return true;
            } else {
                const destinationNoChargeMsg = `Destino [${fila},${columna}] alcanzado SIN carga (${chargeAfterCell.toFixed(2)}). Inválido.`;
                this.pathLog.push(destinationNoChargeMsg); // Preservado
                console.log(destinationNoChargeMsg);     // Preservado
                // Continuar con la lógica de backtrack al no retornar true
            }
        }
        
        // Si la carga es <=0 después de todos los efectos (y no es el destino), es un camino inválido.
        // Esto también maneja el caso de llegar al destino sin carga.
        if (chargeAfterCell <= 0) {
            this.pathLog.push(`Sin energía tras efectos en [${fila},${columna}] (Carga: ${chargeAfterCell.toFixed(2)}). Abortando rama.`); // Preservado
            // Continuar con la lógica de backtrack
        } else {
            // --- 5. Efectos de Movimiento Especial (Agujero de Gusano) ---
            const wormholeIdx = currentWormholes.findIndex(wh =>
                wh.entrada?.[0] === fila && wh.entrada?.[1] === columna && !wh.usado && wh.salida?.length === 2
            );

            if (wormholeIdx !== -1) {
                const wh = currentWormholes[wormholeIdx];
                
                // Actualizar cadena de acción para el paso actual para incluir el uso del agujero de gusano
                const wormholeActionDescription = `Usó Gusano de [${wh.entrada[0]},${wh.entrada[1]}] a [${wh.salida[0]},${wh.salida[1]}]`;
                newStep.action = (newStep.action === "Mover" || newStep.action === "Zona Recarga (neutral)") 
                               ? wormholeActionDescription 
                               : `${newStep.action}, ${wormholeActionDescription}`;
                
                this.pathLog.push(`Usando agujero de gusano desde [${fila},${columna}] hacia [${wh.salida[0]},${wh.salida[1]}].`); // Preservado
                wh.usado = true;

                if (this._findPathRecursive(wh.salida[0], wh.salida[1], chargeAfterCell, currentPath, visitedInCurrentPath, currentWormholes, currentBlackHoles)) {
                    return true; 
                }
                
                wh.usado = false; // Retroceder estado 'usado' del agujero de gusano
                this.pathLog.push(`Retorno de agujero de gusano desde [${fila},${columna}] no llevó a solución. Abortando rama del gusano.`); // Preservado
                // Si el camino del agujero de gusano falla, esta rama específica del camino (usando el agujero de gusano) falla.
                // Continuar con la lógica principal de backtrack para la celda actual (fila, columna).
            } else {
                 // --- 6. Movimientos recursivos (Arriba, Abajo, Izquierda, Derecha) ---
                 // Solo si no se tomó un agujero de gusano desde esta celda.
                const moves = [
                    { df: -1, dc: 0, dir: "Arriba" }, { df: 1,  dc: 0, dir: "Abajo" },
                    { df: 0,  dc: -1, dir: "Izquierda" }, { df: 0,  dc: 1, dir: "Derecha" }
                ];

                for (const move of moves) {
                    if (this._findPathRecursive(fila + move.df, columna + move.dc, chargeAfterCell, currentPath, visitedInCurrentPath, currentWormholes, currentBlackHoles)) {
                        return true;
                    }
                }
            }
        }

        // --- Retroceso (Backtrack) ---
        if (bhDestroyedInfo) { // Restaurar BH destruido por estrella si no se encontró solución desde esta celda/rama
            currentBlackHoles.splice(bhDestroyedInfo.originalIndex, 0, bhDestroyedInfo.bh);
        }
        currentPath.pop(); // Eliminar paso actual del camino
        visitedInCurrentPath.delete(cellKey);
        this.pathLog.push(`Backtrack desde [${fila},${columna}]. Ningún movimiento desde aquí llevó a solución.`); // Preservado
        return false;
    }

    getSolutionPath() {
        return this.solutionPath;
    }

    getPathLog() {
        return this.pathLog;
    }
}
