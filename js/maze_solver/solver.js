// filepath: /home/notmnt903/Documentos/GitHub/Front/js/maze_solver/solver.js
class MazeSolver {
    constructor(universe) {
        this.universe = universe;
        this.solutionPath = null;
        this.pathLog = []; // Para registrar la cadena de pasos
        this.explorationCounter = 0; // Contador para logs periódicos
        this.logLiveFrequency = 1000000; // Frecuencia para mostrar logs en vivo (cada N exploraciones)
    }

    solve() {
        const startFila = this.universe.origen[0];
        const startColumna = this.universe.origen[1];
        const initialCharge = this.universe.cargaInicialNave;

        // Estado inicial para elementos mutables (copias profundas para la recursión)
        const initialWormholes = JSON.parse(JSON.stringify(this.universe.agujerosGusano));
        initialWormholes.forEach(wh => wh.usado = wh.usado || false); // Asegurar que 'usado' exista

        const initialBlackHoles = JSON.parse(JSON.stringify(this.universe.agujerosNegros));

        this.pathLog = []; // Limpiar log previo
        this.solutionPath = null;

        console.log(`Iniciando búsqueda desde [${startFila}, ${startColumna}] con carga ${initialCharge}. Destino: [${this.universe.destino[0]}, ${this.universe.destino[1]}]`);
        // No es necesario duplicar este console.log en pathLog si ya se muestra al inicio.

        const found = this._findPathRecursive(
            startFila,
            startColumna,
            initialCharge,
            [], // currentPath
            new Set(), // visitedInCurrentPath (para evitar ciclos en la ruta actual)
            initialWormholes,
            initialBlackHoles
        );

        if (found) {
            console.log("¡Solución encontrada!");
            const sol_msg = "Solución encontrada.";
            this.pathLog.push(sol_msg);
            this.solutionPath.forEach((step, index) => {
                const logMsg = `Paso ${index}: Celda [${step.fila}, ${step.columna}], Carga restante: ${step.chargeAfterCell.toFixed(2)}, Acción: ${step.action}`;
                console.log(logMsg); // Mostrar paso de la solución inmediatamente
                this.pathLog.push(logMsg);
            });
        } else {
            console.log("No se encontró una solución válida.");
            const no_sol_msg = "No se encontró una solución válida después de explorar todos los caminos.";
            this.pathLog.push(no_sol_msg);
            console.log(no_sol_msg); // Mostrar este mensaje final también
        }
        return this.solutionPath;
    }

    _isValidCell(fila, columna) {
        return fila >= 0 && fila < this.universe.matriz.filas &&
               columna >= 0 && columna < this.universe.matriz.columnas;
    }

    _findPathRecursive(fila, columna, currentCharge, currentPath, visitedInCurrentPath, currentWormholes, currentBlackHoles) {
        this.explorationCounter++;
        const cellKey = `${fila}-${columna}`;
        
        const exploringMsg = `Explorando [${fila},${columna}], Carga actual: ${currentCharge.toFixed(2)}`;
        this.pathLog.push(exploringMsg);
        if (this.explorationCounter % this.logLiveFrequency === 0) {
            console.log(`(Exploración #${this.explorationCounter}) ${exploringMsg}`);
        }

        // --- 1. Validaciones y Condiciones Base ---
        if (!this._isValidCell(fila, columna)) {
            const invalidCellMsg = `Intento de ir a celda inválida [${fila},${columna}]. Abortando rama.`;
            this.pathLog.push(invalidCellMsg);
            // console.log(invalidCellMsg); // Eliminado para reducir verbosidad
            return false; // Fuera de límites
        }

        // Es un agujero negro (según el estado actual de currentBlackHoles)?
        if (currentBlackHoles.some(bh => bh.fila === fila && bh.columna === columna)) {
            const blackHoleMsg = `Celda [${fila},${columna}] es un agujero negro. Bloqueada.`;
            this.pathLog.push(blackHoleMsg);
            // console.log(blackHoleMsg); // Eliminado
            return false;
        }

        // Evitar ciclos en la ruta actual
        if (visitedInCurrentPath.has(cellKey)) {
            const cycleMsg = `Ciclo detectado en [${fila},${columna}]. Abortando rama.`;
            this.pathLog.push(cycleMsg);
            // console.log(cycleMsg); // Eliminado
            return false;
        }
        
        let chargeAfterCell = currentCharge;
        let actionDescription = "Mover";

        // --- 2. Aplicar costo de la celda actual (si no es zona de recarga) ---
        const isRecharge = this.universe.isRechargeZone(fila, columna);
        if (!isRecharge) {
            const cellEnergyCost = (this.universe.matrizInicial[fila] && this.universe.matrizInicial[fila][columna] !== undefined) ?
                                   this.universe.matrizInicial[fila][columna] : 0;
            chargeAfterCell -= cellEnergyCost;
            actionDescription += ` (Costo celda: ${cellEnergyCost})`;
        }

        // Si la carga es <=0 DESPUÉS del costo de la celda (y no es el destino), es un camino inválido.
        if (chargeAfterCell <= 0 && !(fila === this.universe.destino[0] && columna === this.universe.destino[1])) {
            const noEnergyCellCostMsg = `Sin energía en [${fila},${columna}] tras costo de celda (Carga: ${chargeAfterCell.toFixed(2)}). Abortando rama.`;
            this.pathLog.push(noEnergyCellCostMsg);
            // console.log(noEnergyCellCostMsg); // Eliminado
            return false;
        }

        // Añadir celda actual al camino y marcar como visitada en esta ruta
        visitedInCurrentPath.add(cellKey);
        const newStep = { fila, columna, chargeBeforeCell: currentCharge, chargeAfterCell: chargeAfterCell, action: actionDescription };
        const nextPath = [...currentPath, newStep];


        // --- 3. Aplicar efectos especiales de la celda ---

        // Celda con carga requerida (tratada como costo adicional)
        const requiredChargeData = this.universe.getRequiredChargeCell(fila, columna);
        if (requiredChargeData && requiredChargeData.coordenada && requiredChargeData.coordenada.length === 2) {
            // Validar si la nave TIENE SUFICIENTE CARGA para el requisito de la celda.
            // La descripción dice "celdas que requieren un nivel de carga mínima para acceder".
            // Si la carga actual (ANTES de restar cargaGastada) es menor que cargaGastada, no puede estar aquí.
            // Esto es un poco ambiguo: ¿es un peaje o un mínimo para entrar?
            // Asumamos que es un peaje que se resta. Si la carga se vuelve <=0, falla.
            chargeAfterCell -= requiredChargeData.cargaGastada;
            newStep.action += `, Peaje Carga Req.: ${requiredChargeData.cargaGastada}`;
            if (chargeAfterCell <= 0 && !(fila === this.universe.destino[0] && columna === this.universe.destino[1])) {
                visitedInCurrentPath.delete(cellKey); // Backtrack
                const noEnergyTollMsg = `Sin energía tras peaje en [${fila},${columna}]. Abortando rama.`;
                this.pathLog.push(noEnergyTollMsg);
                // console.log(noEnergyTollMsg); // Eliminado
                return false;
            }
        }
        
        // Zona de recarga
        if (isRecharge) {
            const rechargeZoneData = this.universe.getRechargeZone(fila, columna);
            if (rechargeZoneData) {
                chargeAfterCell *= rechargeZoneData.multiplicador;
                newStep.action = `Zona Recarga x${rechargeZoneData.multiplicador}`; // Sobrescribe acción
                const rechargeMsg = `Celda [${fila},${columna}] es Zona Recarga. Carga ahora: ${chargeAfterCell.toFixed(2)}`;
                this.pathLog.push(rechargeMsg);
                // console.log(rechargeMsg); // Eliminado
            }
        }
        newStep.chargeAfterCell = chargeAfterCell; // Actualizar carga final en el path

        // --- 4. Llegó al destino? ---
        if (fila === this.universe.destino[0] && columna === this.universe.destino[1]) {
            if (chargeAfterCell > 0) { // Debe tener energía al llegar al destino
                this.solutionPath = nextPath;
                const destinationReachedMsg = `Destino [${fila},${columna}] alcanzado con carga ${chargeAfterCell.toFixed(2)}.`;
                this.pathLog.push(destinationReachedMsg);
                console.log(destinationReachedMsg); // Mantenido: evento importante
                return true;
            } else {
                const destinationNoChargeMsg = `Destino [${fila},${columna}] alcanzado SIN carga (${chargeAfterCell.toFixed(2)}). Inválido.`;
                this.pathLog.push(destinationNoChargeMsg);
                console.log(destinationNoChargeMsg); // Mantenido: evento importante
                visitedInCurrentPath.delete(cellKey); // Backtrack
                return false;
            }
        }
        
        // Si la carga es <=0 después de todos los efectos (y no es el destino), es un camino inválido.
        if (chargeAfterCell <= 0) {
            visitedInCurrentPath.delete(cellKey); // Backtrack
            const noEnergyEffectsMsg = `Sin energía tras efectos en [${fila},${columna}] (Carga: ${chargeAfterCell.toFixed(2)}). Abortando rama.`;
            this.pathLog.push(noEnergyEffectsMsg);
            // console.log(noEnergyEffectsMsg); // Eliminado
            return false;
        }

        // --- 5. Efectos que modifican el entorno para esta rama (Estrellas, Agujeros de Gusano) ---
        let nextWormholesState = JSON.parse(JSON.stringify(currentWormholes));
        let nextBlackHolesState = JSON.parse(JSON.stringify(currentBlackHoles));

        // Estrella Gigante: Intenta destruir el agujero negro más cercano
        if (this.universe.isGiantStar(fila, columna)) {
            let closestBlackHoleIndex = -1;
            let minDistance = Infinity;
            for (let i = 0; i < nextBlackHolesState.length; i++) {
                const bh = nextBlackHolesState[i];
                const distance = Math.abs(bh.fila - fila) + Math.abs(bh.columna - columna);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestBlackHoleIndex = i;
                }
            }
            if (closestBlackHoleIndex !== -1) {
                const destroyedBH = nextBlackHolesState.splice(closestBlackHoleIndex, 1)[0];
                newStep.action += `, Estrella destruyó BH en [${destroyedBH.fila},${destroyedBH.columna}]`;
                const starEffectMsg = `Estrella en [${fila},${columna}] destruyó BH en [${destroyedBH.fila},${destroyedBH.columna}].`;
                this.pathLog.push(starEffectMsg);
                // console.log(starEffectMsg); // Eliminado
            }
        }

        // Agujero de Gusano: Si existe uno en la celda actual y no está usado, se usa.
        // La especificación dice "Se consumen al usarse".
        const wormholeIndex = nextWormholesState.findIndex(wh =>
            wh.entrada && wh.entrada.length === 2 && wh.entrada[0] === fila && wh.entrada[1] === columna && !wh.usado &&
            wh.salida && wh.salida.length === 2
        );

        if (wormholeIndex !== -1) {
            const wormholeToUse = nextWormholesState[wormholeIndex];
            nextWormholesState[wormholeIndex].usado = true; // Marcar como usado en la copia local

            newStep.action += `, Usó Gusano de [${wormholeToUse.entrada[0]},${wormholeToUse.entrada[1]}] a [${wormholeToUse.salida[0]},${wormholeToUse.salida[1]}]`;
            const wormholeUsedMsg = `Usando agujero de gusano desde [${fila},${columna}] hacia [${wormholeToUse.salida[0]},${wormholeToUse.salida[1]}].`;
            this.pathLog.push(wormholeUsedMsg);
            // console.log(wormholeUsedMsg); // Eliminado

            if (this._findPathRecursive(wormholeToUse.salida[0], wormholeToUse.salida[1], chargeAfterCell, nextPath, visitedInCurrentPath, nextWormholesState, nextBlackHolesState)) {
                return true;
            }
            // Si usar el agujero de gusano no lleva a una solución, esta rama específica (usando el gusano) falla.
            // No se intentan otros movimientos desde esta celda SI SE USA el gusano, según la interpretación de "se consumen al usarse"
            // y que es un túnel directo.
            visitedInCurrentPath.delete(cellKey); // Backtrack
            const wormholeFailMsg = `Retorno de agujero de gusano desde [${fila},${columna}] no llevó a solución. Abortando rama del gusano.`;
            this.pathLog.push(wormholeFailMsg);
            // console.log(wormholeFailMsg); // Eliminado
            return false;
        }

        // --- 6. Movimientos recursivos (Arriba, Abajo, Izquierda, Derecha) ---
        const moves = [
            { df: -1, dc: 0, dir: "Arriba" },
            { df: 1,  dc: 0, dir: "Abajo" },
            { df: 0,  dc: -1, dir: "Izquierda" },
            { df: 0,  dc: 1, dir: "Derecha" }
        ];

        for (const move of moves) {
            const nextFila = fila + move.df;
            const nextColumna = columna + move.dc;
            
            // this.pathLog.push(`Desde [${fila},${columna}] (Carga: ${chargeAfterCell.toFixed(2)}), intentando mover ${move.dir} a [${nextFila},${nextColumna}].`);
            // console.log(`Desde [${fila},${columna}] (Carga: ${chargeAfterCell.toFixed(2)}), intentando mover ${move.dir} a [${nextFila},${nextColumna}].`); // Opcional: log por cada intento de movimiento

            if (this._findPathRecursive(nextFila, nextColumna, chargeAfterCell, nextPath, visitedInCurrentPath, nextWormholesState, nextBlackHolesState)) {
                return true;
            }
        }

        // --- Backtrack ---\
        visitedInCurrentPath.delete(cellKey);
        const backtrackMsg = `Backtrack desde [${fila},${columna}]. Ningún movimiento desde aquí llevó a solución.`;
        this.pathLog.push(backtrackMsg);
        // console.log(backtrackMsg); // Eliminado
        return false;
    }

    getSolutionPath() {
        return this.solutionPath;
    }

    getPathLog() {
        return this.pathLog;
    }
}
