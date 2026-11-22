export const DOCUMENTS = {
  terms: {
    title: 'Termos de Uso',
    subtitle: 'Orientações para o uso da plataforma.',
    sections: [
      ['Conta e autenticação', 'A conta é autenticada pelo Supabase Auth. Você pode entrar com e-mail e senha ou usar o provedor Google. Quando necessário, o Arboris.X exige um código adicional enviado ao e-mail da conta para concluir o acesso.'],
      ['Uso seguro', 'Use apenas uma conta que pertença a você, mantenha suas credenciais em segurança e não compartilhe códigos de acesso. O código adicional é temporário e deve ser informado somente nesta aplicação.'],
      ['Serviços integrados', 'A autenticação e os dados da conta dependem dos serviços Supabase. O envio do código adicional depende do serviço de e-mail configurado pelo Arboris.X. A disponibilidade desses serviços pode afetar o acesso.'],
      ['Uso da plataforma', 'Não tente contornar controles de autenticação ou acessar dados de outras pessoas. O aceite destes termos é solicitado no cadastro e antes de continuar com Google.'],
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    subtitle: 'Informações sobre dados e privacidade.',
    sections: [
      ['Dados recebidos do Google', 'Se você escolher entrar com Google, o Google e o Supabase Auth processam os dados de identidade necessários ao login, como identificador da conta, e-mail e, quando disponibilizados, nome e foto de perfil. O Arboris.X usa o e-mail para identificar a conta e realizar a autorização adicional; o nome pode ser usado para exibir a conta e personalizar mensagens de acesso. O projeto não solicita acesso ao Gmail, Drive ou outros dados da conta Google por meio deste login.'],
      ['Conta e autenticação', 'O Supabase Auth gerencia a identidade e a sessão, inclusive os dados fornecidos pelo método de login escolhido. No fluxo Google, o projeto lê o e-mail, o nome disponível e a presença de identidade Google para autenticar e autorizar a conta. No fluxo por senha, a senha é tratada pelo provedor de autenticação; o Arboris.X não a grava no arquivo JSON legado.'],
      ['Uso e armazenamento no projeto', 'O banco de dados do projeto mantém o nome do perfil e registros necessários à autorização adicional, como identificadores de sessão, tentativas, limites de envio e eventos de segurança. Quando necessário, é gerado um código de seis dígitos válido por cinco minutos; o banco armazena um resumo HMAC do código, não o código em texto aberto.'],
      ['Compartilhamento e serviços', 'O Supabase processa autenticação, dados da conta e sessão. Quando há confirmação adicional, o serviço de e-mail configurado recebe o endereço e o conteúdo necessários para entregar o código; mensagens de confirmação, recuperação de senha e novos acessos também dependem dos serviços configurados. O Google participa da autenticação quando você escolhe esse método. O projeto não usa os dados do login Google para publicidade nem os vende.'],
      ['Sessões e navegador', 'A sessão Supabase é mantida no armazenamento local do navegador para permitir a continuidade do acesso; scripts executados na origem da aplicação podem acessá-la. O navegador também pode manter dados temporários do fluxo de autenticação e preferências da interface. O recurso opcional de navegador confiável só pode ser usado quando estiver habilitado. Encerre a sessão ao terminar em computadores compartilhados.'],
      ['Retenção e solicitações', 'Esta versão ainda não define prazos próprios de retenção. Os prazos dependem das configurações dos provedores e da consolidação do armazenamento legado. Para informações ou solicitações sobre dados pessoais, escreva para arborisx@gmail.com.'],
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    subtitle: 'Como o navegador é usado nesta versão do Arboris.X.',
    sections: [
      ['Uso atual', 'A sessão de autenticação do Supabase é mantida no armazenamento local do navegador. O recurso opcional de dispositivo confiável, quando habilitado, usa um cookie de segurança para reconhecer este navegador após a verificação da conta.'],
      ['Preferências e dados temporários', 'A aplicação também pode guardar preferências de aparência e informações temporárias necessárias ao fluxo de acesso no armazenamento do navegador. Esses dados não representam medições do aparelho.'],
      ['Controle no navegador', 'Você pode encerrar a sessão e limpar os dados do site nas configurações do navegador. Isso pode exigir um novo login e remover preferências locais. Esta página descreve apenas o funcionamento atual da aplicação.'],
    ],
  },
  returns: {
    title: 'Trocas e devoluções',
    subtitle: 'Informações sobre o funcionamento atual da plataforma.',
    sections: [
      ['Escopo atual', 'Esta aplicação apresenta recursos de monitoramento ambiental e acesso à conta. Não há carrinho, pagamento, venda ou entrega de produtos pela interface Arboris.X.'],
      ['Solicitações', 'Como a aplicação não realiza vendas, não há um procedimento de troca ou devolução dentro dela. Para dúvidas relacionadas ao Arboris.X, escreva para arborisx@gmail.com e descreva sua solicitação sem compartilhar senhas ou códigos de acesso.'],
    ],
  },
};
