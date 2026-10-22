export default {
    PRIVACY_POLICY: 'politique de confidentialité',
    COPYRIGHT_TEXT: 'Tous droits réservés',
    EMAIL_SALUTATION_TEXT: `Cordialement,`,
    EMAIL_SIGNATURE_TEXT: `L'équipe {{brandName}}.`,
    SUPPORT: 'soutien',
    UNSUBSCRIBE: 'se désabonner',
    EMAIL_FOOTER_INFO: 'Vous recevez ce message car vous possédez un compte auprès de',
    WELCOME_EMAIL_SUBJECT: `{{brandName}} Inscription réussie — Vérifiez votre adresse e-mail`,
    WELCOME_EMAIL_TEXT: `
        <h4>Bienvenue sur {{brandName}}, {{firstName}}</h4>
        <p>Merci d'avoir créé un compte. Nous sommes ravis de vous aider à gérer vos finances.</p>
        <p>Pour commencer, veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous.</p>
        <p>Si vous n'avez pas créé ce compte, veuillez ignorer cet e-mail.</p>
    `,
    VERIFY_EMAIL_BUTTON_TEXT: "Vérifier l'adresse e-mail",
    RESET_PASSWORD_VERIFICATION_CODE_TEXT: "Code de vérification",
    EMAIL_VERIFIED_SUCCESS: `
        <h1>Félicitations, {{firstName}}</h1>
        <p>Votre adresse e-mail a été vérifiée avec succès. Vous avez désormais un accès complet à votre compte {{brandName}}.</p>
        <p>Voici ce que vous pouvez faire ensuite :</p>
        <ul>
            <li>Configurez vos catégories de revenus et dépenses</li>
            <li>Ajoutez votre première transaction</li>
            <li>Créez un budget mensuel</li>
        </ul>
        <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe d'assistance.</p>
    `,
    RESEND_VERIFICATION_EMAIL_SUBJECT: `{{brandName}} — Vérifiez votre adresse e-mail`,
    RESET_PASSWORD_EMAIL_SUBJECT: `{{brandName}} Compte : Demande de réinitialisation de mot de passe reçue`,
    RESEND_VERIFICATION_EMAIL_TEXT: `
    <h1>Bonjour {{firstName}}</h1>
    <p>Nous avons reçu une demande de renvoi du lien de vérification pour votre compte {{brandName}}.</p>
    <p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail et activer votre compte.</p>
    <p>Ce lien expirera dans {{expiryMinutes}} minutes. Si vous n'avez pas fait cette demande, veuillez ignorer cet e-mail.</p>
    `,
    RESET_PASSWORD_EMAIL_TEXT: `
    <h1>Bonjour {{firstName}}</h1>
    <p>Nous avons reçu une demande de réinitialisation du mot de passe de votre compte {{brandName}}.</p>
    <p>Si vous êtes à l'origine de cette demande, utilisez le code de vérification ci-dessous pour réinitialiser votre mot de passe.</p>
    <p>Ce code expirera dans {{expiryMinutes}} minutes. Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet e-mail.</p>
    `,
    RESPONSE_MSG_EMAIL_VERIFIED: 'E-mail vérifié avec succès',
    RESPONSE_MSG_USER_CREATED: 'Utilisateur créé avec succès',
    RESPONSE_EMAIL_VERIFICATION_LINK_SENT: 'Lien de vérification envoyé. Veuillez consulter votre boîte mail.',
    RESPONSE_PASSWORD_RESET_CODE_SENT: 'Le code de vérification de réinitialisation du mot de passe a été envoyé',
    RESPONSE_PASSWORD_CHANGED: 'Votre mot de passe a été mis à jour.',
    RESPONSE_LOGIN_SUCCESSFUL: 'Connexion réussie',
    ERROR_INVALID_RESET_TOKEN: 'Mot de passe à usage unique invalide ou expiré. Veuillez en demander un nouveau.',
    ERROR_EXPIRED_RESET_TOKEN: 'Mot de passe à usage unique expiré, veuillez en demander un nouveau.',
    ERROR_INVALID_USER: 'Adresse e-mail ou mot de passe invalide',
    ERROR_ACCOUNT_DEACTIVATED: 'Votre compte a été désactivé. Veuillez contacter l\'assistance.'

}