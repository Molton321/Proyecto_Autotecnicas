// filepath: /home/notmnt903/Documentos/GitHub/Front/js/maze_solver/universe.js

class BlackHole {
    constructor(fila, columna) {
        this.fila = fila;
        this.columna = columna;
    }
}

class GiantStar {
    constructor(fila, columna) {
        this.fila = fila;
        this.columna = columna;
    }
}

class Wormhole {
    constructor(entrada, salida) {
        this.entrada = entrada; // [fila, columna]
        this.salida = salida;   // [fila, columna]
        this.usado = false; // Los agujeros de gusano se consumen al usarse
    }
}

class RechargeZone {
    constructor(fila, columna, multiplicador) {
        this.fila = fila;
        this.columna = columna;
        this.multiplicador = multiplicador;
    }
}

class Universe {
    constructor(jsonData) {
        this.matriz = jsonData.matriz; // { filas: M, columnas: N }
        this.origen = jsonData.origen; // [fila, columna]
        this.destino = jsonData.destino; // [fila, columna]

        this.agujerosNegros = jsonData.agujerosNegros.map(bh => new BlackHole(bh[0], bh[1]));
        this.estrellasGigantes = jsonData.estrellasGigantes.map(gs => new GiantStar(gs[0], gs[1]));
        this.agujerosGusano = jsonData.agujerosGusano.map(wh => new Wormhole(wh.entrada, wh.salida));
        this.zonasRecarga = jsonData.zonasRecarga.map(rz => new RechargeZone(rz[0], rz[1], rz[2]));
        // Se almacena el array original del JSON para celdasCargaRequerida
        this.celdasCargaRequerida = jsonData.celdasCargaRequerida; 

        this.cargaInicialNave = jsonData.cargaInicial;
        this.matrizInicial = jsonData.matrizInicial; // Matriz MxN con costos de energía
    }

    getCellCost(fila, columna) {
        if (fila >= 0 && fila < this.matriz.filas && columna >= 0 && columna < this.matriz.columnas && this.matrizInicial[fila] && this.matrizInicial[fila][columna] !== undefined) {
            // Verificar si es una zona de recarga, en cuyo caso el costo es 0 (o se maneja de forma especial)
            if (this.isRechargeZone(fila, columna)) {
                return 0; // En zonas de recarga no se aplica el gasto de energía de la celda.
            }
            return this.matrizInicial[fila][columna];
        }
        return Infinity; // Costo infinito para celdas fuera de la matriz o no definidas
    }

    isBlackHole(fila, columna) {
        return this.agujerosNegros.some(bh => bh.fila === fila && bh.columna === columna);
    }

    isGiantStar(fila, columna) {
        return this.estrellasGigantes.some(gs => gs.fila === fila && gs.columna === columna);
    }

    getWormholeAt(fila, columna) {
        return this.agujerosGusano.find(wh => wh.entrada[0] === fila && wh.entrada[1] === columna && !wh.usado);
    }

    useWormhole(wormhole) {
        const wh = this.agujerosGusano.find(w => w.entrada[0] === wormhole.entrada[0] && w.entrada[1] === wormhole.entrada[1]);
        if (wh) {
            wh.usado = true;
        }
    }

    isRechargeZone(fila, columna) {
        return this.zonasRecarga.some(rz => rz.fila === fila && rz.columna === columna);
    }

    getRechargeZone(fila, columna) {
        return this.zonasRecarga.find(rz => rz.fila === fila && rz.columna === columna);
    }
    
    getRequiredChargeCell(fila, columna) {
        // Asume que cada elemento en celdasCargaRequerida es un objeto como:
        // { coordenada: [f, c], cargaGastada: val }
        // El ejemplo en matriz_ejemplo.json muestra coordenada: [valor_unico],
        // lo cual es ambiguo para una cuadrícula 2D.
        // Se procede asumiendo que coordenada debería ser [fila, columna].
        // Si 'coordenada' es un índice único o tiene otra estructura, esta lógica debe cambiar.
        return this.celdasCargaRequerida.find(rc => 
            rc.coordenada && 
            rc.coordenada.length === 2 && // Asegura que sea un par [fila, columna]
            rc.coordenada[0] === fila && 
            rc.coordenada[1] === columna
        );
    }

    // Método para destruir el agujero negro MÁS CERCANO a una estrella gigante.
    // NOTA: Esta lógica ahora destruye el agujero negro globalmente más cercano a la estrella,
    // no necesariamente uno adyacente como el nombre del método podría sugerir originalmente.
    // Esto concuerda con la solicitud de buscar "a partir de todos los agujeros negros existentes el más cercano".
    destroyAdjacentBlackHole(starFila, starColumna) {
        if (!this.agujerosNegros || this.agujerosNegros.length === 0) {
            console.log("No hay agujeros negros para destruir.");
            return false; 
        }

        let closestBlackHoleIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.agujerosNegros.length; i++) {
            const bh = this.agujerosNegros[i];
            // Calculamos la distancia Manhattan (suma de diferencias absolutas en coordenadas)
            const distance = Math.abs(bh.fila - starFila) + Math.abs(bh.columna - starColumna);

            if (distance < minDistance) {
                minDistance = distance;
                closestBlackHoleIndex = i;
            }
        }

        if (closestBlackHoleIndex !== -1) {
            const removedBlackHole = this.agujerosNegros.splice(closestBlackHoleIndex, 1);
            console.log("Se destruyó el agujero negro más cercano:", removedBlackHole[0], "a distancia", minDistance, "de la estrella en [", starFila, ",", starColumna, "]");
            return true; 
        }

        // Esto no debería ocurrir si la lista de agujeros negros no está vacía al inicio.
        console.log("No se encontró un agujero negro para destruir (esto no debería pasar si la lista no está vacía).");
        return false; 
    }
}

