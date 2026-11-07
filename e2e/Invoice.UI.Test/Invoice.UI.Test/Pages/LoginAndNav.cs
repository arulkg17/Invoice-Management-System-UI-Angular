namespace Invoice.UI.Tests.Pages;

/// <summary>The login box lives on the home page (/home).</summary>
public sealed class LoginPage
{
    private readonly IPage _page;

    public LoginPage(IPage page) => _page = page;

    public Task GotoAsync() => _page.GotoAsync("/home");

    public async Task LoginAsync(string userName, string password)
    {
        await _page.GetByPlaceholder("User Name").FillAsync(userName);
        await _page.GetByPlaceholder("Password").FillAsync(password);
        await _page.GetByRole(AriaRole.Button, new() { Name = "Login", Exact = true }).ClickAsync();
    }

    public Task ExpectSuccessAsync() => Assertions.Expect(_page.GetByText("Login Successfull")).ToBeVisibleAsync();

    public Task ExpectFailureAsync() => Assertions.Expect(_page.GetByText("Login Failed")).ToBeVisibleAsync();
}

/// <summary>The top menu bar.</summary>
public sealed class NavBar
{
    private readonly IPage _page;

    public NavBar(IPage page) => _page = page;

    /// <summary>OpenAsync("Masters", "Categories") = click Masters, then click Categories.</summary>
    public async Task OpenAsync(string menu, string item)
    {
        await _page.GetByRole(AriaRole.Button, new() { Name = menu, Exact = true }).ClickAsync();
        await _page.GetByRole(AriaRole.Menuitem, new() { Name = item, Exact = true }).ClickAsync();
    }

    public ILocator UserButton => _page.Locator("button.user-name");

    public async Task LogoutAsync()
    {
        await OpenAsync("Exit", "Logout");
        await _page.GetByRole(AriaRole.Button, new() { Name = "Logout", Exact = true }).ClickAsync();
    }
}
