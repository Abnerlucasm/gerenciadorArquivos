# Software de Busca de Arquivos

Um aplicativo web robusto para monitoramento e busca de arquivos em diretórios de rede, com interface moderna e recursos avançados de notificação.

## 🚀 Funcionalidades

### Busca e Monitoramento
- 📂 Monitoramento simultâneo de múltiplos diretórios
- 🔍 Sistema avançado de filtros
- 🔄 Atualização automática da lista de arquivos
- 📊 Organização inteligente por data (últimas 24h e mais antigos)

### Interface e Usabilidade
- 🌓 Modo claro/escuro
- 🎨 Design responsivo e intuitivo
- 📱 Interface adaptativa para diferentes dispositivos
- ⚡ Carregamento dinâmico de conteúdo

### Notificações e Downloads
- 🔔 Sistema de notificações em tempo real
- 💾 Download direto dos arquivos
- 📥 Gerenciador de downloads com progresso
- 🔄 Monitoramento de status dos downloads

### Filtros Disponíveis
- 🔤 Nome do arquivo (contém/começa com)
- 📁 Extensão do arquivo (.exe, .ear, .bat, .pdf, etc)
- 📅 Data (criação/modificação)
- ⬆️ Ordenação (alfabética, cronológica)

## 📋 Pré-requisitos

- Node.js (v14+)
- NPM ou Yarn
- Acesso aos diretórios de rede
- Navegador moderno com suporte a ES6+

## 🔧 Instalação

1. Clone o repositório:

> ```bash
> git clone [url-do-repositorio]
> ```

2. Instale as dependências:
   

   > ```bash
> npm install
> ```

ou

> ```bash
> yarn install
> ```

3. Configure o arquivo `.env`:

> ```env
> NODE_ENV=development
> PORT=3000
> ```

4. Inicie o servidor:
> ```bash
> npm start
> ```

ou

> ```bash
> yarn start
> ```



## ⚙️ Configuração

### Diretórios Monitorados
- Adicione múltiplos diretórios para monitoramento
- Suporte a caminhos de rede (UNC)
- Validação automática de permissões

### Filtros e Extensões
- Configuração flexível de filtros
- Suporte a múltiplas extensões
- Personalização de critérios de busca

### Notificações
- Intervalo configurável
- Notificações do sistema
- Histórico de alertas

## 🔒 Segurança

- Validação de caminhos
- Sanitização de entradas
- Controle de acesso a diretórios
- Logs de sistema

## 🛠️ Desenvolvimento

### Modo de Desenvolvimento
- Hot-reload
- Logs detalhados
- Ferramentas de teste
- Recursos de debug

### Logs
- Rotação automática de logs
- Retenção configurável
- Níveis de log personalizáveis

## 📄 Licença

Este projeto está sob a licença [INSERIR LICENÇA].

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request
