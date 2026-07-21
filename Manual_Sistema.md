# Manual de Funcionalidades do ERP Conectado

Este documento detalha o funcionamento e os recursos operacionais do sistema de gestão integrada (ERP), projetado para conectar a matriz **Pharmix** e suas respectivas **Filiais**.

---

## 1. Dashboard (Painel de Indicadores & Modo TV)
O Dashboard é a central de controle visual do sistema, adaptando-se de acordo com o nível de acesso do usuário (Matriz ou Filial).

### Painel da Matriz (Pharmix)
* **Consolidação Financeira**: Exibe o faturamento total consolidado (convertendo vendas das filiais de Real para Dólar em tempo real).
* **Gráfico de Participação (Donut Chart)**: Mostra graficamente a fatia de faturamento de cada unidade com totalizador centralizado em Dólar ($ USD).
* **Gráfico de Evolução**: Histórico mensal comparativo de vendas e compras.
* **Filtros Temporais**: Seleção rápida de períodos (Este Mês, Últimos 3 Meses, Último Ano) para recalcular todas as métricas instantaneamente.

### Painel das Filiais
* **Faturamento Local**: Exibe dados financeiros e métricas de desempenho em Reais (R$ BRL).
* **Gráfico de Top Vendas**: Exibe em formato de barras horizontais os 5 medicamentos mais vendidos daquela unidade específica.

### 📺 Modo TV (Monitoramento de Escritório)
* **Visualização Independente**: Interface de tela cheia sem menus laterais, otimizada para televisores corporativos.
* **Faturamento Acumulado**: Exibe o faturamento bruto do mês atual (dia 1 até o último dia do mês).
* **Meta de Vendas Editável**: Campo interativo para definir a meta de faturamento mensal direto pela tela da TV (salva no navegador local).
* **Barra de Progresso**: Indicador visual dinâmico com a porcentagem concluída e o valor restante para bater a meta.
* **Atualização em Tempo Real**: Atualiza os dados de forma automática e silenciosa a cada 60 segundos.
* **Restrição de Acesso**: Acesso exclusivo para a Matriz (Pharmix); filiais que tentam acessar a rota são bloqueadas e redirecionadas.

---

## 2. Produtos
Módulo focado no cadastramento e controle de preços dos medicamentos comercializados.
* **Dados Cadastrais**: Cada produto possui nome comercial, código único de barras/referência e status de atividade.
* **Preço de Custo (Dólar)**: Definição do valor de aquisição de importação (USD) usado nas compras.
* **Preço de Venda (Real)**: Definição do preço final de venda praticado em território nacional (BRL).

---

## 3. Compras (Importações Internacionais)
Gerenciamento de reposição de estoque com fornecedores globais.
* **Lançamento de Pedidos**: Registro de ordens de compra contendo fornecedor, produto, quantidade e preço unitário em Dólares ($ USD).
* **Status do Pedido**: Controle de fases (PENDENTE, EM TRANSITO, RECEBIDO).
* **Entrada de Estoque Automatizada**: 
  - Ao alterar o status de um pedido para **RECEBIDO**, o sistema abre um formulário solicitando as informações do lote recebido (Número do Lote, Data de Validade e Código de Rastreamento).
  - Ao confirmar, o sistema gera automaticamente o lote no estoque e registra a movimentação de entrada.
* **Recebimento Direto na Criação**: Ao cadastrar uma compra diretamente como `RECEBIDO`, o sistema exige os dados do lote no próprio cadastro inicial, agilizando o processo e evitando furos de estoque.

---

## 4. Estoque (Gestão de Lotes & Validades)
Módulo crítico de controle físico de medicamentos da Matriz, focado em evitar perdas e gerenciar o inventário.
* **Detalhamento por Lotes**: Ao expandir um produto, o sistema exibe a tabela com todos os lotes ativos, quantidades físicas em estoque, datas de validade e o status de conformidade.
* **Alertas de Validade por Cores**:
  - 🔴 **Vencido**: Medicamento cuja data de validade já expirou.
  - 🔴 **Crítico (Piscante)**: Vence nos próximos 30 dias (exige despacho rápido ou devolução).
  - 🟡 **Alerta**: Vence entre 30 e 90 dias.
  - 🟢 **Seguro**: Validade confortável superior a 90 dias.
* **Filtro de Vencimento com Auto-Expansão**: Atalho visual que filtra a lista exibindo apenas produtos com lotes em risco (<= 90 dias) e abre os lotes automaticamente na tela.
* **Movimentações Manuais**:
  - **Entrada Manual**: Adiciona quantidade de um produto criando um novo lote.
  - **Saída Manual**: Permite remover quantidades selecionando **exatamente de qual lote** a retirada física está ocorrendo.
* **Edição de Informações de Lote**: Permite corrigir o Número do Lote e a Data de Validade de qualquer lote existente em caso de erro de digitação.
* **Devolução Rápida de Vencidos**: Botão "Devolver" visível apenas em lotes vencidos que zera o estoque do lote selecionado e registra uma baixa por devolução.

---

## 5. Vendas (Nacionais & Faturamento)
Módulo que processa a saída de produtos para clientes externos e abastecimento das filiais.
* **Lançamento de Vendas**: Criação de pedidos com CPF do comprador, produto, quantidade e valor em Reais (R$ BRL).
* **Autofill de CPF**: Seleção de clientes cadastrados que preenche automaticamente o CPF do cliente, evitando erros de digitação.
* **Abastecimento Automático de Filial**:
  - Quando uma filial faz uma compra na Pharmix, isso gera uma venda pendente de envio.
  - O sistema calcula se a Matriz tem estoque físico suficiente para atender à filial.
  - Se houver déficit, o sistema impede o envio e sugere a **geração automática de uma ordem de compra** ao fornecedor parceiro.
* **Trava de Segurança Antiduplicidade**: Ao gerar a compra automática pelo déficit, o sistema altera o status da venda para `COMPRA_SOLICITADA` e bloqueia o botão de gerar compra, impedindo que o operador clique duas vezes e duplique a compra de reposição.
* **Confirmação de Despacho**: Liberação do envio mediante inserção do código de rastreamento logístico.

---

## 6. Contatos (Clientes & Fornecedores)
Cadastros unificados de parceiros comerciais.
* **Clientes**: Ficha cadastral contendo nome, e-mail, telefone, endereço completo e CPF do paciente/cliente frequente.
* **Fornecedores**: Ficha cadastral contendo empresa fornecedora, e-mail, telefone, endereço e CNPJ da distribuidora parceira.
