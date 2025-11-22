const msmc = require('msmc');
const path = require('path');

async function loginMicrosoft(sender) {
    try {
        const authManager = new msmc.Auth("select_account");

        // Launch the login window
        // We use the 'electron' framework option which is standard for msmc in electron
        const xboxManager = await authManager.launch("electron");

        // Get the Minecraft token
        const token = await xboxManager.getMinecraft();

        // Check if we have a valid token
        if (token.validate()) {
            // Return the mclc-compatible auth object
            return token.mclc();
        } else {
            throw new Error("Token validation failed");
        }
    } catch (error) {
        console.error("Microsoft Login Error:", error);
        throw error;
    }
}

module.exports = { loginMicrosoft };
