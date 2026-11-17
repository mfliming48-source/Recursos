# Meus Recursos

Gestão de ganhos, despesas, limites, recorrentes e projectos, com relatório mensal (PDF e CSV).
Front-end estático no GitHub Pages; login e dados no Firebase (plano gratuito).

## Configurar o Firebase
1. Em https://console.firebase.google.com crie um projecto.
2. **Authentication > Método de início de sessão**: active Email/palavra-passe (e Google, se quiser).
3. **Firestore Database**: crie a base de dados em modo de produção.
4. **Firestore > Regras**: cole o conteúdo de `firestore.rules` e publique.
5. **Definições do projecto > As suas apps > Web (</>)**: registe a app e copie a configuração para `firebase-config.js`.

## Publicar no GitHub Pages
1. Crie um repositório e envie estes ficheiros:
   `git init && git add . && git commit -m "Meus Recursos" && git branch -M main && git remote add origin <URL> && git push -u origin main`
2. No repositório: **Settings > Pages > Deploy from a branch > main / (root)**.
3. No Firebase: **Authentication > Definições > Domínios autorizados** e adicione `SEU-UTILIZADOR.github.io`.

O site fica em `https://SEU-UTILIZADOR.github.io/NOME-DO-REPOSITORIO/`.

## Como usar
- **Recorrentes**: registe o salário e as despesas fixas; em cada mês, carregue em *Lançar recorrentes* (não duplica).
- **Movimentos**: ganhos e despesas. Escreva uma categoria nova e ela é criada.
- **Categorias**: defina o limite mensal; o Resumo avisa aos 80% e aos 100%.
- **Relatório**: escolha o mês e carregue em *Exportar PDF* (na janela de impressão, escolha "Guardar como PDF").
