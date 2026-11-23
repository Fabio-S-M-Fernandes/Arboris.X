export const DOCUMENTS = {
  terms: {
    title: 'Termos de Uso',
    subtitle: 'Orientações para o uso da plataforma.',
    sections: [
      ['Conta e autenticação', 'A conta é autenticada pelo Supabase Auth. Você pode entrar com e-mail e senha ou escolher o Google. Após a confirmação do e-mail em uma conta nova, o primeiro acesso solicita a leitura e o aceite destes Termos de Uso e da Política de Privacidade. Quando necessário, um código temporário enviado ao e-mail também confirma o acesso.'],
      ['Uso seguro', 'Use apenas uma conta que pertença a você, mantenha suas credenciais em segurança e não compartilhe códigos de acesso. O código adicional é temporário e deve ser informado somente nesta aplicação.'],
      ['Serviços integrados', 'A autenticação e os dados da conta dependem dos serviços Supabase. O envio do código adicional depende do serviço de e-mail configurado pelo Arboris.X. A disponibilidade desses serviços pode afetar o acesso.'],
      ['Uso da plataforma', 'Use a plataforma para conhecer o projeto e seus recursos educativos. O protótipo físico exibe a temperatura localmente; a integração automática com o site ainda está em desenvolvimento. O modo demonstração apresenta valores simulados e identificados, que não são medições ambientais reais. Não use uma leitura isolada como diagnóstico de uma ilha de calor ou como orientação de saúde. Não tente contornar controles de acesso nem consultar dados de outras pessoas.'],
      ['Aceite e conta', 'Para contas novas, o aceite dos Termos de Uso e da Política de Privacidade é solicitado antes do primeiro acesso ao Dashboard. A escolha sobre o uso opcional de cookies é independente. Se você não concordar com os documentos obrigatórios, a conta recém-criada e os registros vinculados no projeto serão excluídos.'],
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    subtitle: 'Quais informações são recebidas, para que são usadas e quais serviços participam do acesso.',
    sections: [
      ['Dados recebidos do Google', 'Se você escolher entrar com Google, o Google e o Supabase Auth processam os dados básicos de identidade retornados para autenticar a conta, como identificador, e-mail e, quando disponibilizados, nome e foto de perfil. O Arboris.X usa o identificador e o e-mail para reconhecer e autorizar a conta; o nome disponível pode ser apresentado na interface. A aplicação não solicita acesso ao Gmail, Drive, contatos ou outros conteúdos da sua conta Google.'],
      ['Conta e autenticação', 'O Supabase Auth gerencia a identidade e a sessão conforme o método de entrada escolhido. No acesso com Google, os dados básicos do perfil retornados pelo provedor podem permanecer nos registros de autenticação do Supabase; o Arboris.X usa o e-mail e o nome disponível para identificar e apresentar a conta. No acesso por senha, a senha é tratada pelo serviço de autenticação e não é armazenada pela aplicação em texto legível.'],
      ['Leituras ambientais', 'O protótipo físico mede a temperatura e apresenta o valor em sua própria tela. Nesta versão, essas leituras ainda não são enviadas automaticamente à plataforma. O modo demonstração pode apresentar valores simulados no navegador; eles são identificados como exemplos e não são tratados como medições reais do aparelho.'],
      ['Uso e armazenamento no projeto', 'O banco de dados mantém o nome do perfil e registros necessários à autorização adicional, como identificadores de sessão, tentativas, limites de envio e eventos de segurança. Quando necessário, é gerado um código de seis dígitos válido por cinco minutos; o banco guarda um resumo HMAC para validar o código, não o código em texto legível. O aceite obrigatório e a escolha opcional sobre cookies também ficam registrados para a conta.'],
      ['Compartilhamento e serviços', 'O Supabase processa autenticação, dados da conta, sessão e registros associados. Quando há confirmação adicional, o serviço de e-mail configurado recebe o endereço e o conteúdo necessários para entregar o código. Mensagens de confirmação e recuperação de senha também dependem dos serviços configurados. O Google participa da autenticação quando você escolhe esse método. O projeto não vende os dados do login Google nem os utiliza para publicidade.'],
      ['Sessões e navegador', 'A sessão Supabase fica no armazenamento local do navegador para manter o acesso entre páginas; scripts executados na origem da aplicação podem acessá-la. O navegador também pode guardar dados temporários do fluxo de autenticação e preferências da interface. O cookie de navegador confiável é opcional e só é utilizado quando o recurso está habilitado e a preferência correspondente foi aceita. Em computadores compartilhados, encerre a sessão ao terminar.'],
      ['Retenção e solicitações', 'Esta versão não define um prazo próprio único de retenção. Os prazos dependem das configurações dos provedores e das necessidades dos registros de autorização. Se uma conta nova recusar os documentos obrigatórios antes do primeiro acesso, a conta e os registros vinculados no projeto são excluídos. Para pedir informações ou tratar dados pessoais relacionados à conta, escreva para arborisx@gmail.com.'],
    ],
  },
  cookies: {
    title: 'Política de Cookies',
    subtitle: 'Entenda a diferença entre a sessão necessária e a preferência opcional de navegador confiável.',
    sections: [
      ['Sessão de acesso', 'A sessão de autenticação do Supabase é mantida no armazenamento local do navegador para que você continue conectado ao navegar pela aplicação. Esse armazenamento é necessário ao funcionamento da conta e é diferente de um cookie opcional de preferência.'],
      ['Navegador confiável', 'Quando o recurso está habilitado, o Arboris.X pode usar um cookie para reconhecer um navegador depois da verificação adicional de acesso. Essa opção depende do aceite opcional na tela de documentos e da escolha de confiar no navegador durante a confirmação. Se não aceitar, você ainda pode acessar a conta; talvez precise confirmar o código em novos acessos.'],
      ['Preferências e dados temporários', 'A aplicação também pode guardar preferências de aparência e informações temporárias necessárias ao fluxo de acesso no armazenamento do navegador. Esses dados não representam medições do aparelho nem são usados para identificar condições ambientais.'],
      ['Controle no navegador', 'Você pode sair da conta e limpar os dados do site nas configurações do navegador. A limpeza pode encerrar sua sessão, exigir um novo login e remover preferências locais. Esta política descreve o funcionamento atual da aplicação, que pode mudar durante o desenvolvimento.'],
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
