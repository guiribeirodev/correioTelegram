require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

// Substitua pelos tokens e IDs
const bot = new Telegraf(process.env.BOT_TOKEN);
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID; // Canal de revisão
const FINAL_CHANNEL_ID = process.env.FINAL_CHANNEL_ID;   // Canal final
const FINAL_GROUP_ID = process.env.FINAL_GROUP_ID;       // Grupo final

// Comando /start
bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
        ctx.reply(
            `Olá! 👋\nEnvie sua mensagem anônima, e ela será analisada antes de ser publicada no canal e no grupo.`
        );
    } else {
        ctx.reply('Este bot só funciona em chats privados. Envie uma mensagem diretamente para mim. 😊');
    }
});

// Comando /correiostats
bot.command('correiostatus', (ctx) => {
        ctx.reply('O correio está funcionando normalmente! ✅');
});

// Ouve todas as mensagens de texto
bot.on('text', async (ctx) => {
    if (ctx.chat.type !== 'private') return; // Ignora mensagens de grupos

    const userMessage = ctx.message.text;

    // Formata a mensagem para o canal de revisão (texto simples)
    const messageToSend = userMessage;

    try {
        // Envia a mensagem para o canal de revisão com botões de Aceitar/Recusar
        await bot.telegram.sendMessage(
            REVIEW_CHANNEL_ID,
            messageToSend,
            {
                // parse_mode: 'Markdown',  // Usando Markdown (simples) para evitar problemas com Markdown
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ Aceitar', `accept:${ctx.message.message_id}`),
                        Markup.button.callback('❌ Recusar', `reject:${ctx.message.message_id}`),
                    ],
                ]),
            }
        );
        ctx.reply('Sua mensagem foi enviada para análise. 🚀');
    } catch (error) {
        console.error('Erro ao enviar mensagem para o canal de análise:', error);
        ctx.reply('Houve um erro ao enviar sua mensagem. Tente novamente mais tarde.');
    }
});

// Aceitar mensagens
bot.action(/accept:(.+)/, async (ctx) => {
    const messageId = ctx.match[1];

    try {
        // Recupera a mensagem original que foi enviada para o canal
        const originalMessage = ctx.update.callback_query.message.text;

        // Atualiza a mensagem no canal de revisão
        await ctx.editMessageText(
            `${originalMessage}\n\n✅ **Mensagem aceita!**`,
            // { parse_mode: 'Markdown' }
        );

        // Envia a mensagem para o canal final
        await bot.telegram.sendMessage(
            FINAL_CHANNEL_ID,
            `💌 *Um admirador secreto me falou...:*\n\n${originalMessage}`,
            // { parse_mode: 'Markdown' }
        );

        // Envia a mensagem para o grupo final
        await bot.telegram.sendMessage(
            FINAL_GROUP_ID,
            `💌 *Psiu!? 💕 Um admirador secreto deixou um recado especial pra você:*\n\n${originalMessage}\n\n@correioAeF`,
            // { parse_mode: 'Markdown' }
        );

        await ctx.answerCbQuery('Mensagem aceita e enviada para o canal e o grupo! 🎉');
    } catch (error) {
        console.error('Erro ao aceitar mensagem:', error);
        await ctx.answerCbQuery('Erro ao aceitar mensagem. 😕');
    }
});


// Recusar mensagens
bot.action(/reject:(.+)/, async (ctx) => {
    try {
        // Atualiza a mensagem no canal de revisão
        await ctx.editMessageText(
            `${ctx.update.callback_query.message.text}\n\n❌ **Mensagem recusada.**`,
            { parse_mode: 'Markdown' }
        );

        await ctx.answerCbQuery('Mensagem recusada com sucesso! 🛑');
    } catch (error) {
        console.error('Erro ao recusar mensagem:', error);
        await ctx.answerCbQuery('Erro ao recusar mensagem. 😕');
    }
});

// Inicia o bot
bot.launch().then(() => {
    console.log('Bot de Correio Elegante está rodando...');
});

// Tratamento seguro de encerramento
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
