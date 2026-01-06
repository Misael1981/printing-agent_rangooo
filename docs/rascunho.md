```
<div class="container">
      <section class="brand">
        <div class="brand-config">
          <div class="brand-img">
            <img src="../public/img/logo-agente-branca.svg" alt="logo agente" />
          </div>
          <div class="brand-description">
            <h1>Agente de impressão Rangooo</h1>
            <p>Versão: <span id="versao-electron">—</span></p>
          </div>
        </div>
        <button class="settings">
          <img src="../public/assets/settings.svg" alt="Icon de config" />
        </button>
      </section>

      <section class="printer-section">
        <div class="printer-section_content">
          <h3>🖨️ Impressora de pedidos</h3>
          <div>
            <label for="printer-select">Selecione a impressora:</label>
            <select id="printer-select">
              <option value="">Carregando impressoras...</option>
            </select>
          </div>
          <div
            id="custom-printer-wrapper"
            style="display: none; margin-top: 8px"
          >
            <label for="custom-printer-input">Nome da impressora:</label>
            <input
              type="text"
              id="custom-printer-input"
              placeholder="Ex: EPSON TM-T20"
            />
            <small> Use apenas se a impressora não aparecer na lista. </small>
          </div>
          <div class="printer-actions">
            <button id="save-printer">Salvar</button>
            <button id="print-test" class="print-test">Testar impressão</button>
          </div>
          <p id="printer-feedback" class="feedback"></p>
        </div>
      </section>

      <section class="badge-section">
        <div class="badge-center">
          <p>
            Status impressora:
            <span id="status-badge" class="badge badge-status badge-secondary">
              Desconectado
            </span>
          </p>
        </div>
        <div class="badge-center">
          <p>
            Status Servidor:
            <span id="status-server" class="badge offline">Desconectado</span>
          </p>
        </div>
      </section>

      <!-- Config -->
      <div id="main-screen"></div>
      <section
        id="config-screen"
        style="display: none; padding: 20px; text-align: center"
      >
        <h3>Configuração Inicial</h3>
        <p>Insira o ID do Restaurante para começar:</p>
        <input
          type="text"
          id="restaurant-id-input"
          placeholder="Ex: b7a8ae0d..."
          style="
            width: 80%;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 5px;
            border: 1px solid #ccc;
          "
        />
        <br />
        <button
          id="btn-salvar-config"
          style="
            padding: 10px 20px;
            cursor: pointer;
            background-color: #4caf50;
            color: white;
            border: none;
            border-radius: 5px;
          "
        >
          Salvar e Conectar
        </button>
      </section>

      <section class="log-container">
        <div class="log-title">Log de Atividades</div>
        <div id="log"></div>
      </section>

      <footer class="footer">
        <div class="container-btns">
          <button id="print-test" class="btn connect">Imprimir teste</button>
        </div>
      </footer>
    </div>
    <script src="./renderer.js"></script>
```
