using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

/// <summary>These tests start logged OUT, so they see the real login screen.</summary>
[TestFixture]
public class LoginTests : UiTest
{
    protected override bool StartLoggedIn => false;

    [Test]
    public async Task Valid_credentials_log_in_and_the_token_is_stored()
    {
        var login = new LoginPage(Page);
        await login.GotoAsync();

        var request = await Page.RunAndWaitForRequestAsync(
            () => login.LoginAsync(Settings.UserName, Settings.Password),
            r => r.Method == "POST" && r.Url.Contains("/v1/login", StringComparison.OrdinalIgnoreCase));

        Assert.That(request.Url, Does.StartWith(Settings.ApiBaseUrl).IgnoreCase,
            $"The Angular app is calling {request.Url}, not {Settings.ApiBaseUrl}. " +
            "Point src/environments/environment.ts apiUrl at Invoice.CqrsAPI and restart ng serve.");

        await login.ExpectSuccessAsync();

        var token = await Page.EvaluateAsync<string?>("() => localStorage.getItem('token')");
        Assert.That(token, Is.Not.Null.And.Not.Empty, "The JWT should be saved in localStorage.");

        await Assertions.Expect(new NavBar(Page).UserButton).ToContainTextAsync(Settings.UserName, new() { IgnoreCase = true });
    }

    [Test]
    public async Task Wrong_password_shows_Login_Failed_and_stores_no_token()
    {
        var login = new LoginPage(Page);
        await login.GotoAsync();
        await login.LoginAsync(Settings.UserName, "definitely-wrong-" + TestData.Token(4));

        await login.ExpectFailureAsync();

        var token = await Page.EvaluateAsync<string?>("() => localStorage.getItem('token')");
        Assert.That(token, Is.Null.Or.Empty);
    }

    [Test]
    public async Task Unknown_user_shows_Login_Failed()
    {
        var login = new LoginPage(Page);
        await login.GotoAsync();
        await login.LoginAsync("nobody-" + TestData.Token(6), "Whatever@123");

        await login.ExpectFailureAsync();
    }

    [TestCase("/masters/categories")]
    [TestCase("/transactions/po")]
    [TestCase("/transactions/stock")]
    public async Task Protected_pages_send_a_logged_out_user_back_to_home(string path)
    {
        await Page.GotoAsync(path);

        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/home$"));
    }

    [Test]
    public async Task Logout_removes_the_session_and_the_guard_blocks_the_pages_again()
    {
        var login = new LoginPage(Page);
        await login.GotoAsync();
        await login.LoginAsync(Settings.UserName, Settings.Password);
        await login.ExpectSuccessAsync();

        await new NavBar(Page).LogoutAsync();

        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/home$"));
        Assert.That(await Page.EvaluateAsync<string?>("() => localStorage.getItem('token')"), Is.Null.Or.Empty);

        await Page.GotoAsync("/masters/items");
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/home$"));
    }

    [Test]
    public async Task Signup_and_forgot_password_links_open_their_pages()
    {
        await new LoginPage(Page).GotoAsync();

        await Page.GetByRole(AriaRole.Link, new() { Name = "Sign up here" }).ClickAsync();
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/signup$"));

        await Page.GotoAsync("/home");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Reset it here" }).ClickAsync();
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/forgot-password$"));
    }
}
