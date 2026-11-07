namespace Invoice.UI.Tests.Pages;

/// <summary>
/// Small helpers for Angular Material widgets. Why they exist:
///  * Icon-only buttons (edit, delete ...) have no accessible name, because Angular Material hides the icon text from
///    the accessibility tree. We find them by the icon NAME inside them instead.
///  * mat-select options and dialogs are rendered in an overlay at the end of the page, not inside the form.
/// </summary>
public static class Ui
{
    /// <summary>The message bar (MatSnackBar) at the bottom of the screen.</summary>
    public static ILocator Snackbar(this IPage page) => page.Locator("mat-snack-bar-container");

    public static Task ExpectToastAsync(this IPage page, string text) =>
        Assertions.Expect(page.Snackbar()).ToContainTextAsync(text, new() { IgnoreCase = true });

    public static Task ExpectToastAsync(this IPage page, Regex pattern) =>
        Assertions.Expect(page.Snackbar()).ToHaveTextAsync(pattern);

    /// <summary>A row of a Material table that contains the text.</summary>
    public static ILocator TableRow(this IPage page, string text) =>
        page.Locator("tr[mat-row]").Filter(new() { HasText = text });

    /// <summary>The button inside <paramref name="scope"/> that contains the Material icon with this name ("edit", "delete" ...).</summary>
    public static ILocator IconButton(this ILocator scope, string icon) =>
        scope.Locator("button").Filter(new()
        {
            Has = scope.Page.Locator("mat-icon", new() { HasTextRegex = new Regex($"^\\s*{Regex.Escape(icon)}\\s*$") })
        });

    /// <summary>Opens a mat-select and picks the option whose text contains <paramref name="optionText"/>.</summary>
    public static async Task ChooseOptionAsync(this IPage page, ILocator select, string optionText, bool exact = false)
    {
        await select.ClickAsync();
        await page.GetByRole(AriaRole.Option, new() { Name = optionText, Exact = exact }).First.ClickAsync();
    }

    public static ILocator DialogBox(this IPage page) => page.GetByRole(AriaRole.Dialog);

    /// <summary>The confirm box (ConfirmDialogComponent): checks the title if given, clicks the confirm button, waits until it is gone.</summary>
    public static async Task ConfirmAsync(this IPage page, string confirmButton, string? titleContains = null)
    {
        var dialog = page.DialogBox();
        await Assertions.Expect(dialog).ToBeVisibleAsync();

        if (titleContains is not null)
        {
            await Assertions.Expect(dialog.GetByRole(AriaRole.Heading)).ToContainTextAsync(titleContains);
        }

        await dialog.GetByRole(AriaRole.Button, new() { Name = confirmButton, Exact = true }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
    }

    /// <summary>The PDF preview that opens after saving a PO / Receipt / Invoice: check the title, then close it.</summary>
    public static async Task ClosePdfPreviewAsync(this IPage page, string titleContains)
    {
        var dialog = page.DialogBox();
        await Assertions.Expect(dialog.GetByRole(AriaRole.Heading)).ToContainTextAsync(titleContains);
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Close", Exact = true }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
    }

    /// <summary>The "Verify PO-..." preview has an extra Approve button.</summary>
    public static async Task ApproveInPdfPreviewAsync(this IPage page, string titleContains)
    {
        var dialog = page.DialogBox();
        await Assertions.Expect(dialog.GetByRole(AriaRole.Heading)).ToContainTextAsync(titleContains);
        await dialog.GetByRole(AriaRole.Button, new() { Name = "Approve", Exact = true }).ClickAsync();
        await Assertions.Expect(dialog).ToBeHiddenAsync();
    }

    public static Regex Exactly(string label) => new($"^{Regex.Escape(label)}\\s*\\*?$");
}

/// <summary>Base class of the form pages: finds fields by their visible label, the way a user does.</summary>
public abstract class FormBase
{
    protected FormBase(IPage page, ILocator? root = null)
    {
        Page = page;
        Root = root ?? page.Locator("app-root");
    }

    protected IPage Page { get; }
    protected ILocator Root { get; }

    /// <summary>Text box / text area by its label (a trailing * for required fields is ignored).</summary>
    public ILocator Field(string label) => Root.GetByLabel(Ui.Exactly(label));

    /// <summary>mat-select by its label.</summary>
    public ILocator Select(string label) =>
        Root.GetByRole(AriaRole.Combobox, new() { NameRegex = new Regex($"^{Regex.Escape(label)}") });

    public ILocator Checkbox(string label) => Root.GetByRole(AriaRole.Checkbox, new() { Name = label, Exact = true });

    public ILocator SaveButton => Root.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^(Save|Update)$") });

    public ILocator CloseButton => Root.GetByRole(AriaRole.Button, new() { Name = "Close", Exact = true });

    public ILocator Errors => Root.Locator("mat-error");

    public Task SaveAsync() => SaveButton.ClickAsync();

    public Task CloseAsync() => CloseButton.ClickAsync();
}
