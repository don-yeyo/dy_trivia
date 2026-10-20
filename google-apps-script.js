/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT - WEBHOOK TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)
 * Archivo: Código.gs
 * Planilla: https://docs.google.com/spreadsheets/d/1txRiWnszPxjH0iixtr_zwHDFYAiArOyIaVlylXECJCw
 * 
 * INSTRUCCIONES DE ACTUALIZACIÓN EN GOOGLE SHEETS:
 * 1. Abre tu planilla y ve al menú superior: Extensiones > Apps Script.
 * 2. Reemplaza todo el contenido de 'Código.gs' con este código.
 * 3. Guarda (icono de disco).
 * 4. IMPORTANTE PARA QUE TOME EFECTO:
 *    - Haz clic en el botón azul superior: "Implementar" > "Administrar implementaciones".
 *    - Haz clic en el icono del lápiz (Editar) a la derecha de tu implementación activa.
 *    - En el selector "Versión", elige "Nueva versión".
 *    - Haz clic en "Implementar" y luego en "Listo".
 * ==============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Acción: Actualizar configuraciones en la pestaña 'Configuracion'
    if (data.action === "UPDATE_CONFIG" && data.updates) {
      updateConfigKeys(ss, data.updates);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Configuración actualizada en Google Sheets"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Acción: Guardar respuesta individual de pregunta en tiempo real
    if (data.action === "SAVE_QUESTION_ANSWER" && data.answer) {
      saveIndividualAnswer(ss, data);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Pregunta guardada"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Acción: Importar nómina de participantes masivamente
    if (data.action === "IMPORT_PARTICIPANTES" && data.participantes) {
      var resImport = importParticipantesSheet(ss, data.participantes, data.modo || "REPLACE");
      return ContentService.createTextOutput(JSON.stringify(resImport))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Acción: Poblar datos de prueba desde script
    if (data.action === "POBLAR_DEMO") {
      poblarDesdePayload(ss, data);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Tablas pobladas con éxito"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Acción: Marcar fecha y hora de envío de newsletter en columna específica
    if (data.action === "MARCAR_NEWSLETTER") {
      var resMarca = marcarNewsletterParticipante(ss, data);
      return ContentService.createTextOutput(JSON.stringify(resMarca))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 6. Acción: Obtener datos y encabezados completos de la pestaña 'Participantes'
    if (data.action === "GET_PARTICIPANTES_RAW") {
      var resRaw = getParticipantesRaw(ss);
      return ContentService.createTextOutput(JSON.stringify(resRaw))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Acción: Actualizar preguntas y opciones en la pestaña 'Preguntas'
    if (data.action === "UPDATE_PREGUNTAS" && data.updates) {
      var resPreguntas = updatePreguntasSheet(ss, data.updates);
      return ContentService.createTextOutput(JSON.stringify(resPreguntas))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 8. Acción: Actualizar correos de participantes y blanquear marcas de mailing
    if (data.action === "UPDATE_PARTICIPANTES_EMAILS" && data.updates) {
      var resEmails = updateParticipantesEmails(ss, data.updates);
      return ContentService.createTextOutput(JSON.stringify(resEmails))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "OK"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza o inserta claves en la pestaña 'Configuracion'
 * Soporta de manera transparente pestañas con o sin fila de encabezado.
 */
function updateConfigKeys(ss, updates) {
  var sheetConfig = ss.getSheetByName("Configuracion");
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet("Configuracion");
    sheetConfig.appendRow(["clave", "valor", "descripcion"]);
    sheetConfig.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0d2c5c").setFontColor("#ffffff");
  }

  var data = sheetConfig.getDataRange().getValues();
  if (!data || data.length === 0) {
    for (var k in updates) {
      sheetConfig.appendRow([k, updates[k], "Parámetro configurado desde Admin"]);
    }
    return;
  }

  // Detectar inteligentemente si la primera fila es encabezado o dato real
  var firstCell = String(data[0][0] || '').toLowerCase().trim();
  var isHeader = (firstCell === "clave" || firstCell === "key" || firstCell === "parametro");
  var startRow = isHeader ? 1 : 0;

  var keyColIndex = 0; // Columna A por defecto
  var valColIndex = 1; // Columna B por defecto

  if (isHeader) {
    for (var c = 0; c < data[0].length; c++) {
      var h = String(data[0][c]).toLowerCase().trim();
      if (h === "clave" || h === "key" || h === "parametro") keyColIndex = c;
      if (h === "valor" || h === "value") valColIndex = c;
    }
  }

  // Mapear filas existentes por clave (1-based para getRange de Google Sheets)
  var existingKeys = {};
  for (var r = startRow; r < data.length; r++) {
    var rowKey = String(data[r][keyColIndex]).trim().toUpperCase();
    if (rowKey) {
      existingKeys[rowKey] = r + 1; // Fila 1-based
    }
  }

  for (var keyToUpdate in updates) {
    var normalizedKey = String(keyToUpdate).trim().toUpperCase();
    var valToSet = String(updates[keyToUpdate]);

    if (existingKeys[normalizedKey]) {
      var targetRow = existingKeys[normalizedKey];
      sheetConfig.getRange(targetRow, valColIndex + 1).setValue(valToSet);
    } else {
      var newRow = [];
      newRow[keyColIndex] = normalizedKey;
      newRow[valColIndex] = valToSet;
      newRow[2] = "Parámetro configurado desde Admin";
      sheetConfig.appendRow(newRow);
      existingKeys[normalizedKey] = sheetConfig.getLastRow();
    }
  }
}

/**
 * Guarda o actualiza la respuesta de una pregunta individual en la pestaña 'Resultados'
 */
function saveIndividualAnswer(ss, data) {
  var sheetResultados = ss.getSheetByName("Resultados");
  if (!sheetResultados) {
    sheetResultados = ss.insertSheet("Resultados");
    sheetResultados.appendRow([
      "Fecha y Hora", "Legajo", "Fase", "Puntaje Obtenido", "Respuestas Correctas", "Tiempo Total (Segundos)", "Detalle Respuestas (JSON)"
    ]);
    sheetResultados.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e2e8f0");
  }

  var values = sheetResultados.getDataRange().getValues();
  var targetRowIndex = -1;
  var existingAnswers = [];

  // Buscar fila existente para este legajo y fase
  for (var r = 1; r < values.length; r++) {
    var rowLegajo = String(values[r][1]).trim();
    var rowFase = parseInt(values[r][2], 10);
    if (rowLegajo === String(data.legajo).trim() && rowFase === parseInt(data.fase, 10)) {
      targetRowIndex = r + 1;
      var rawJson = values[r][6];
      if (rawJson) {
        try {
          existingAnswers = JSON.parse(rawJson);
        } catch (e) {}
      }
      break;
    }
  }

  // Insertar o actualizar la respuesta en el array de respuestas
  var newAnswer = data.answer;
  var answerIndex = -1;
  for (var i = 0; i < existingAnswers.length; i++) {
    if (existingAnswers[i].questionId === newAnswer.questionId) {
      answerIndex = i;
      break;
    }
  }

  if (answerIndex >= 0) {
    existingAnswers[answerIndex] = newAnswer;
  } else {
    existingAnswers.push(newAnswer);
  }

  // Recalcular métricas acumuladas
  var totalScore = 0;
  var totalCorrect = 0;
  var totalSeconds = 0;

  existingAnswers.forEach(function(ans) {
    totalScore += (ans.pointsEarned || 0);
    if (ans.isCorrect) totalCorrect += 1;
    totalSeconds += (ans.timeSpent || 0);
  });

  var timestamp = data.fechaHoraRespuesta || new Date().toISOString();

  if (targetRowIndex !== -1) {
    sheetResultados.getRange(targetRowIndex, 1).setValue(timestamp);
    sheetResultados.getRange(targetRowIndex, 4).setValue(totalScore);
    sheetResultados.getRange(targetRowIndex, 5).setValue(totalCorrect);
    sheetResultados.getRange(targetRowIndex, 6).setValue(totalSeconds);
    sheetResultados.getRange(targetRowIndex, 7).setValue(JSON.stringify(existingAnswers));
  } else {
    sheetResultados.appendRow([
      timestamp,
      data.legajo,
      data.fase,
      totalScore,
      totalCorrect,
      totalSeconds,
      JSON.stringify(existingAnswers)
    ]);
  }
}

/**
 * Importa o reemplaza masivamente la nómina de colaboradores en la pestaña 'Participantes'
 */
function importParticipantesSheet(ss, participantes, modo) {
  var sheet = ss.getSheetByName("Participantes");
  if (!sheet) {
    sheet = ss.insertSheet("Participantes");
  }

  var headers = ["legajo", "apellido", "nombre", "token_hash", "documento", "sector", "telefono", "email"];

  sheet.clear();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#0d2c5c")
    .setFontColor("#ffffff");

  var rowsToInsert = [];
  var seenLegajos = {};
  var duplicados = 0;

  for (var i = 0; i < participantes.length; i++) {
    var p = participantes[i];
    var leg = String(p.legajo || "").trim();
    if (!leg) continue;

    if (seenLegajos[leg]) {
      duplicados++;
      continue;
    }
    seenLegajos[leg] = true;

    rowsToInsert.push([
      leg,
      String(p.apellido || "").trim(),
      String(p.nombre || "").trim(),
      String(p.token_hash || "").trim(),
      String(p.documento || "").trim(),
      String(p.sector || "").trim(),
      String(p.telefono || "").trim(),
      String(p.email || "").trim()
    ]);
  }

  if (rowsToInsert.length > 0) {
    sheet.getRange(2, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
  }

  return {
    status: "success",
    message: "Participantes importados exitosamente",
    totalImportados: rowsToInsert.length,
    duplicadosOmitidos: duplicados
  };
}

/**
 * Registra la marca temporal (fecha y hora) en la fila del participante y columna de la campaña
 */
function marcarNewsletterParticipante(ss, data) {
  var sheet = ss.getSheetByName("Participantes");
  if (!sheet) {
    return { status: "error", message: "La pestaña 'Participantes' no existe en la planilla." };
  }

  var targetColName = String(data.columna || "").trim();
  if (!targetColName) {
    return { status: "error", message: "No se especificó el nombre de la columna para registrar la marca temporal." };
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { status: "error", message: "La pestaña 'Participantes' está vacía." };
  }

  var headers = values[0];
  var colIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim();
    if (h.toLowerCase() === targetColName.toLowerCase()) {
      colIndex = c;
      break;
    }
  }

  if (colIndex === -1) {
    return {
      status: "error",
      message: "La columna '" + targetColName + "' no fue encontrada en la pestaña 'Participantes'."
    };
  }

  var targetLegajo = String(data.legajo || "").trim();
  var targetEmail = String(data.email || "").trim().toLowerCase();
  var rowIndex = -1;

  if (data.rowIndex && typeof data.rowIndex === "number" && data.rowIndex >= 2 && data.rowIndex <= values.length) {
    rowIndex = data.rowIndex;
  } else {
    var legajoCol = -1;
    var emailCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var colName = String(headers[c] || "").trim().toLowerCase();
      if (colName === "legajo") legajoCol = c;
      if (colName === "email" || colName === "correo") emailCol = c;
    }

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var rLeg = legajoCol >= 0 ? String(row[legajoCol] || "").trim() : "";
      var rMail = emailCol >= 0 ? String(row[emailCol] || "").trim().toLowerCase() : "";

      if ((targetLegajo && rLeg === targetLegajo) || (targetEmail && rMail === targetEmail)) {
        rowIndex = r + 1; // 1-based para Sheets
        break;
      }
    }
  }

  if (rowIndex === -1) {
    return {
      status: "error",
      message: "No se encontró la fila del participante con Legajo: " + targetLegajo + " / Email: " + targetEmail
    };
  }

  var timestamp = String(data.timestamp || new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }));
  sheet.getRange(rowIndex, colIndex + 1).setValue(timestamp);

  return {
    status: "success",
    message: "Marca temporal registrada exitosamente",
    row: rowIndex,
    col: colIndex + 1,
    columna: targetColName,
    timestamp: timestamp
  };
}

/**
 * Devuelve encabezados y filas completas de la pestaña 'Participantes'
 */
function getParticipantesRaw(ss) {
  var sheet = ss.getSheetByName("Participantes");
  if (!sheet) {
    return { status: "error", message: "La pestaña 'Participantes' no existe en la planilla." };
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { status: "success", headers: [], rows: [] };
  }

  var headers = values[0].map(function(h) { return String(h || "").trim(); });
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var rawRow = values[i];
    if (!rawRow || rawRow.every(function(cell) { return String(cell || "").trim() === ""; })) {
      continue;
    }
    rows.push({
      rowIndex: i + 1,
      values: rawRow
    });
  }

  return {
    status: "success",
    headers: headers,
    rows: rows
  };
}

/**
 * Actualiza textos de preguntas y opciones en la pestaña 'Preguntas'
 */
function updatePreguntasSheet(ss, updates) {
  var sheet = ss.getSheetByName("Preguntas");
  if (!sheet) {
    return { status: "error", message: "La pestaña 'Preguntas' no existe en la planilla." };
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { status: "error", message: "La pestaña 'Preguntas' está vacía." };
  }

  var headers = values[0];
  var idCol = -1;
  var pregCol = -1;
  var op1Col = -1;
  var op2Col = -1;
  var op3Col = -1;
  var op4Col = -1;
  var op5Col = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase();
    if (h === "id") idCol = c;
    if (h === "pregunta") pregCol = c;
    if (h === "opcion1") op1Col = c;
    if (h === "opcion2") op2Col = c;
    if (h === "opcion3") op3Col = c;
    if (h === "opcion4") op4Col = c;
    if (h === "opcion5") op5Col = c;
  }

  var updatedCount = 0;

  for (var u = 0; u < updates.length; u++) {
    var item = updates[u];
    var targetId = String(item.id).trim();

    for (var r = 1; r < values.length; r++) {
      var rowId = String(values[r][idCol]).trim();
      if (rowId === targetId) {
        var rowIndex = r + 1; // 1-based para Sheets

        if (item.pregunta !== undefined && pregCol >= 0) {
          sheet.getRange(rowIndex, pregCol + 1).setValue(item.pregunta);
        }
        if (item.opcion1 !== undefined && op1Col >= 0) {
          sheet.getRange(rowIndex, op1Col + 1).setValue(item.opcion1);
        }
        if (item.opcion2 !== undefined && op2Col >= 0) {
          sheet.getRange(rowIndex, op2Col + 1).setValue(item.opcion2);
        }
        if (item.opcion3 !== undefined && op3Col >= 0) {
          sheet.getRange(rowIndex, op3Col + 1).setValue(item.opcion3);
        }
        if (item.opcion4 !== undefined && op4Col >= 0) {
          sheet.getRange(rowIndex, op4Col + 1).setValue(item.opcion4);
        }
        if (item.opcion5 !== undefined && op5Col >= 0) {
          sheet.getRange(rowIndex, op5Col + 1).setValue(item.opcion5);
        }

        updatedCount++;
        break;
      }
    }
  }

  return {
    status: "success",
    message: "Preguntas actualizadas exitosamente en Google Sheets",
    updatedCount: updatedCount
  };
}

/**
 * Actualiza la columna 'email' y blanquea la columna 'Email Link de Trivia' en la pestaña 'Participantes'
 */
function updateParticipantesEmails(ss, updates) {
  var sheet = ss.getSheetByName("Participantes");
  if (!sheet) {
    return { status: "error", message: "La pestaña 'Participantes' no existe en la planilla." };
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return { status: "error", message: "La pestaña 'Participantes' está vacía." };
  }

  var headers = values[0];
  var legajoCol = -1;
  var emailCol = -1;
  var triviaLinkCol = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase();
    if (h === "legajo") legajoCol = c;
    if (h === "email" || h === "correo") emailCol = c;
    if (h === "email link de trivia") triviaLinkCol = c;
  }

  if (legajoCol === -1 || emailCol === -1) {
    return { status: "error", message: "No se encontraron las columnas 'legajo' o 'email' en la pestaña 'Participantes'." };
  }

  var updatedCount = 0;

  for (var u = 0; u < updates.length; u++) {
    var item = updates[u];
    var targetLegajo = String(item.legajo || "").trim();
    var newEmail = String(item.emailCorrecto || "").trim();

    for (var r = 1; r < values.length; r++) {
      var rowLegajo = String(values[r][legajoCol] || "").trim();
      if (rowLegajo === targetLegajo) {
        var rowIndex = r + 1; // 1-based para Sheets

        // 1. Actualizar email
        sheet.getRange(rowIndex, emailCol + 1).setValue(newEmail);

        // 2. Blanquear marca temporal de 'Email Link de Trivia'
        if (triviaLinkCol >= 0) {
          sheet.getRange(rowIndex, triviaLinkCol + 1).setValue("");
        }

        updatedCount++;
        break;
      }
    }
  }

  return {
    status: "success",
    message: "Correos actualizados y marcas blanqueadas exitosamente",
    updatedCount: updatedCount
  };
}
