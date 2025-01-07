require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

// Substitua pelos tokens e IDs
const bot = new Telegraf(process.env.BOT_TOKEN);
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID; // Canal de revisão
const FINAL_CHANNEL_ID = process.env.FINAL_CHANNEL_ID; // Canal final
const FINAL_GROUP_ID = process.env.FINAL_GROUP_ID; // Grupo final

// Comando /start
bot.start((ctx) => {
  if (ctx.chat.type === "private") {
    ctx.reply(
      `Olá! 👋\nEnvie sua mensagem anônima, e ela será analisada antes de ser publicada no canal e no grupo.`
    );
  } else {
    ctx.reply(
      "Este bot só funciona em chats privados. Envie uma mensagem diretamente para mim. 😊"
    );
  }
});

// Comando /correiostatus
bot.command("correiostatus", (ctx) => {
  ctx.reply("O correio está funcionando normalmente! ✅");
});

// Ouve todas as mensagens de texto
bot.on("text", async (ctx) => {
  if (ctx.chat.type !== "private") return; // Ignora mensagens de grupos

  const userMessage = ctx.message.text;
  const userId = ctx.message.from.id;
  const userName = ctx.message.from.first_name || "Usuário sem nome";
  const userUsername = ctx.message.from.username || "Usuário sem @";

  // Formata a mensagem para o canal de revisão (texto simples)
  const messageToSend = userMessage;

  try {
    // Envia a mensagem para o canal de revisão com botões de Aceitar/Recusar/Revelar
    await bot.telegram.sendMessage(REVIEW_CHANNEL_ID, messageToSend, {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Aceitar",
            `accept:${ctx.message.message_id}:${userId}:${userName}:${userUsername}`
          ),
          Markup.button.callback(
            "❌ Recusar",
            `reject:${ctx.message.message_id}:${userId}:${userName}:${userUsername}`
          ),
          Markup.button.callback(
            "🔓 Revelar Autor",
            `reveal:${ctx.message.message_id}:${userId}:${userName}:${userUsername}`
          ),
        ],
      ]),
    });
    ctx.reply("Sua mensagem foi enviada para análise. 🚀");
  } catch (error) {
    console.error("Erro ao enviar mensagem para o canal de análise:", error);
    ctx.reply(
      "Houve um erro ao enviar sua mensagem. Tente novamente mais tarde."
    );
  }
});

// Aceitar mensagens
bot.action(/accept:(.+)/, async (ctx) => {
  const data = ctx.match[1].split(":");
  const [messageId, userId, userName, userUsername] = data;
  const adminName = ctx.callbackQuery.from.first_name || "Admin sem nome";
  const adminUsername = ctx.callbackQuery.from.username || "Admin sem @";

  try {
    // Recupera a mensagem original que foi enviada para o canal
    const originalMessage = ctx.update.callback_query.message.text;

    // Atualiza a mensagem no canal de revisão
    await ctx.editMessageText(
      `${originalMessage}\n\n✅ Mensagem aceita!\n` +
        `👤 Aceito por: ${adminName} (@${adminUsername})`
    );

    // Envia a mensagem para o canal final
    await bot.telegram.sendMessage(
      FINAL_CHANNEL_ID,
      `💌 *Um admirador secreto me falou...:*\n\n${originalMessage}`
    );

    // Envia a mensagem para o grupo final
    await bot.telegram.sendMessage(
      FINAL_GROUP_ID,
      `💌 *Psiu!? 💕 Um admirador secreto deixou um recado especial pra você:*\n\n${originalMessage}\n\n@correioAeF`
    );

    await ctx.answerCbQuery(
      "Mensagem aceita e enviada para o canal e o grupo! 🎉"
    );
  } catch (error) {
    console.error("Erro ao aceitar mensagem:", error);
    await ctx.answerCbQuery("Erro ao aceitar mensagem. 😕");
  }
});

// Recusar mensagens
bot.action(/reject:(.+)/, async (ctx) => {
  const data = ctx.match[1].split(":");
  const [userId, userName, userUsername] = data;
  const adminName = ctx.callbackQuery.from.first_name || "Admin sem nome";
  const adminUsername = ctx.callbackQuery.from.username || "Admin sem @";

  try {
    // Atualiza a mensagem no canal de revisão
    await ctx.editMessageText(
      `${ctx.update.callback_query.message.text}\n\n❌ Mensagem recusada.\n` +
        `👤 Recusado por: ${adminName} (@${adminUsername})`,
      { parse_mode: "Markdown" }
    );

    await ctx.answerCbQuery("Mensagem recusada com sucesso! 🛑");
  } catch (error) {
    console.error("Erro ao recusar mensagem:", error);
    await ctx.answerCbQuery("Erro ao recusar mensagem. 😕");
  }
});

// Função para verificar se o usuário é administrador
async function isAdmin(ctx, userId) {
    try {
      const chatId = REVIEW_CHANNEL_ID; // Usar o ID do canal ou grupo onde o bot tem permissões
      const admins = await bot.telegram.getChatAdministrators(chatId);
      return admins.some(admin => admin.user.id === userId);
    } catch (error) {
      console.error("Erro ao verificar administrador:", error);
      return false; // Caso ocorra um erro, assumimos que o usuário não é administrador
    }
  }
  
  // Revelar autor (inicia o processo)
  bot.action(/reveal:(.+)/, async (ctx) => {
    const data = ctx.match[1].split(":");
    const [messageId, userId, userName, userUsername] = data;
  
    // Verificar se o usuário que acionou a ação é um administrador
    const userIdClicked = ctx.callbackQuery.from.id;
    const isUserAdmin = await isAdmin(ctx, userIdClicked);
  
    if (!isUserAdmin) {
      return ctx.answerCbQuery("Você não tem permissão para revelar o autor. ❌");
    }
  
    try {
      // Envia uma mensagem perguntando se o administrador tem certeza
      await ctx.editMessageText(
        `${ctx.update.callback_query.message.text}\n\n🔓 **Deseja confirmar a revelação do autor?**`,
        Markup.inlineKeyboard([
          Markup.button.callback("✅ Confirmar", `confirmReveal:${messageId}:${userId}:${userName}:${userUsername}`),
          Markup.button.callback("❌ Cancelar", `cancelReveal:${messageId}:${userId}:${userName}:${userUsername}`),
        ])
      );
      await ctx.answerCbQuery("Preparando para revelar autor... 🔓");
    } catch (error) {
      console.error("Erro ao preparar revelação:", error);
      await ctx.answerCbQuery("Erro ao preparar revelação. 😕");
    }
  });
  
  // Confirmar revelação
  bot.action(/confirmReveal:(.+)/, async (ctx) => {
    const data = ctx.match[1].split(":");
    const [messageId, userId, userName, userUsername] = data;
  
    const adminName = ctx.callbackQuery.from.first_name || "Admin sem nome";
    const adminUsername = ctx.callbackQuery.from.username || "Admin sem @";
  
    try {
      // Envia a resposta com os detalhes do autor da mensagem
      await ctx.answerCbQuery(
        `🔓 ID do usuário: ${userId}\nNome: ${userName}\n@${userUsername}`
      );
  
      // Atualiza a mensagem no canal de revisão
      await ctx.editMessageText(
        `${ctx.update.callback_query.message.text}\n\n🔓 **Detalhes do Autor Revelados:**\n` +
          `- Nome: ${userName}\n` +
          `- Username: @${userUsername}\n` +
          `- ID: \`${userId}\`\n\n` +
          `👤 **Revelado por:** ${adminName} (@${adminUsername})\n`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Erro ao revelar autor:", error);
      await ctx.answerCbQuery("Erro ao revelar autor. 😕");
    }
  });
  
  // Cancelar revelação
  bot.action(/cancelReveal:(.+)/, async (ctx) => {
    const data = ctx.match[1].split(":");
    const [messageId, userId, userName, userUsername] = data;
  
    try {
      // Recupera o texto original da mensagem
      const originalMessage = ctx.update.callback_query.message.text.split("\n\n")[0]; // Remove qualquer informação adicional
  
      // Restaura as opções anteriores (Aceitar, Recusar, Revelar)
      await ctx.editMessageText(
        `${originalMessage}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Aceitar",
              `accept:${messageId}:${userId}:${userName}:${userUsername}`
            ),
            Markup.button.callback(
              "❌ Recusar",
              `reject:${messageId}:${userId}:${userName}:${userUsername}`
            ),
            Markup.button.callback(
              "🔓 Revelar Autor",
              `reveal:${messageId}:${userId}:${userName}:${userUsername}`
            ),
          ],
        ])
      );
      await ctx.answerCbQuery("Revelação cancelada. ❌");
    } catch (error) {
      console.error("Erro ao cancelar revelação:", error);
      await ctx.answerCbQuery("Erro ao cancelar revelação. 😕");
    }
  });
  

// Inicia o bot
bot.launch().then(() => {
  console.log("Bot de Correio Elegante está rodando...");
});

// Tratamento seguro de encerramento
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
