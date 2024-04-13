require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function main() {
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "system", content: "You are a helpful assistant."},
            {role: "user", content: "Hi how are you"}
        ],
    });

    const gptResponse = completion.data.choices[0].message.content;
    console.log(gptResponse);
}

main().catch(console.error);

