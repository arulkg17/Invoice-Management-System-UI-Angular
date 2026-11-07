using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Pages;

/// <summary>
/// A master list screen (Category, Customer, Vendor, User, Item): search box, New button, table with edit / delete.
/// The Item screen is the odd one out: it uses text buttons (Edit / Delete) and opens a dialog instead of a new page.
/// </summary>
public class MasterListPage
{
    private readonly string _route;
    private readonly string _addButton;
    private readonly string _searchLabel;
    private readonly bool _iconActions;

    protected MasterListPage(IPage page, string route, string addButton, string searchLabel, bool iconActions = true)
    {
        Page = page;
        _route = route;
        _addButton = addButton;
        _searchLabel = searchLabel;
        _iconActions = iconActions;
    }

    public IPage Page { get; }

    public ILocator AddButton => Page.GetByRole(AriaRole.Button, new() { Name = _addButton });

    public async Task OpenAsync()
    {
        await Page.GotoAsync(_route);
        await Assertions.Expect(AddButton).ToBeVisibleAsync();
    }

    public Task AddAsync() => AddButton.ClickAsync();

    public Task SearchAsync(string text) => Page.GetByLabel(Ui.Exactly(_searchLabel)).FillAsync(text);

    /// <summary>Types in the search box (the list waits 400 ms after the last key) and waits until the row shows up.</summary>
    public async Task FindAsync(string text)
    {
        await SearchAsync(text);
        await Assertions.Expect(Row(text)).ToBeVisibleAsync();
    }

    public ILocator Row(string text) => Page.TableRow(text);

    public Task EditAsync(string rowText) =>
        _iconActions
            ? Row(rowText).IconButton("edit").ClickAsync()
            : Row(rowText).GetByRole(AriaRole.Button, new() { Name = "Edit", Exact = true }).ClickAsync();

    public async Task DeleteAsync(string rowText)
    {
        if (_iconActions)
            await Row(rowText).IconButton("delete").ClickAsync();
        else
            await Row(rowText).GetByRole(AriaRole.Button, new() { Name = "Delete", Exact = true }).ClickAsync();

        await Page.ConfirmAsync("Delete");
    }

    /// <summary>Status filter (All / Active / Inactive) of Category, Customer, Vendor and User lists.</summary>
    public async Task FilterStatusAsync(string status)
    {
        var select = Page.GetByRole(AriaRole.Combobox, new() { NameRegex = new Regex("^Status") });
        await Page.ChooseOptionAsync(select, status, exact: true);
    }

    public Task FilterTextAsync(string label, string value) => Page.GetByLabel(Ui.Exactly(label)).FillAsync(value);
}

// ------------------------------------------------------------------------------------------------ Category

public sealed class CategoriesPage : MasterListPage
{
    public CategoriesPage(IPage page) : base(page, "/masters/categories", "New Category", "Code") { }

    public async Task CreateAsync(CategoryData data, bool active = true)
    {
        await OpenAsync();
        await AddAsync();

        var form = new CategoryForm(Page);
        await form.FillAsync(data, active);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Category created successfully");
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/masters/categories$"));
    }
}

public sealed class CategoryForm : FormBase
{
    public CategoryForm(IPage page) : base(page) { }

    public async Task FillAsync(CategoryData data, bool active = true)
    {
        await Field("Category Code").FillAsync(data.Code);
        await Field("Category Name").FillAsync(data.Name);
        await Field("Description").FillAsync(data.Description);
        await Checkbox("Active").SetCheckedAsync(active);
    }
}

// ------------------------------------------------------------------------------------------------ Customer / Vendor

public sealed class CustomersPage : MasterListPage
{
    public CustomersPage(IPage page) : base(page, "/masters/customers", "New Customer", "Code") { }

    public async Task CreateAsync(PartyData data, bool active = true)
    {
        await OpenAsync();
        await AddAsync();

        var form = new PartyForm(Page, "Customer");
        await form.FillAsync(data, active);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Customer created successfully");
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/masters/customers$"));
    }
}

public sealed class VendorsPage : MasterListPage
{
    public VendorsPage(IPage page) : base(page, "/masters/vendors", "New Vendor", "Code") { }

    public async Task CreateAsync(PartyData data, bool active = true)
    {
        await OpenAsync();
        await AddAsync();

        var form = new PartyForm(Page, "Vendor");
        await form.FillAsync(data, active);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Vendor created successfully");
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/masters/vendors$"));
    }
}

/// <summary>Customer and Vendor forms are identical apart from the word in the labels: "Customer Code" / "Vendor Code".</summary>
public sealed class PartyForm : FormBase
{
    private readonly string _kind;

    public PartyForm(IPage page, string kind) : base(page) => _kind = kind;

    public ILocator Code => Field($"{_kind} Code");
    public ILocator Name => Field($"{_kind} Name");

    public async Task FillAsync(PartyData data, bool active = true)
    {
        await Code.FillAsync(data.Code);
        await Name.FillAsync(data.Name);
        await Field("City").FillAsync(data.City);
        await Field("State").FillAsync(data.State);
        await Checkbox("Active").SetCheckedAsync(active);
    }
}

// ------------------------------------------------------------------------------------------------ User

public sealed class UsersPage : MasterListPage
{
    public UsersPage(IPage page) : base(page, "/masters/users", "New User", "User Name") { }

    public async Task CreateAsync(UserData data)
    {
        await OpenAsync();
        await AddAsync();

        var form = new UserForm(Page);
        await form.FillAsync(data);
        await form.SaveAsync();

        await Page.ExpectToastAsync("User created successfully");
        await Assertions.Expect(Page).ToHaveURLAsync(new Regex("/masters/users$"));
    }
}

public sealed class UserForm : FormBase
{
    public UserForm(IPage page) : base(page) { }

    public async Task FillAsync(UserData d)
    {
        await Field("User Name").FillAsync(d.UserName);
        await Field("Email").FillAsync(d.Email);
        await Field("Password").FillAsync(d.Password);
        await Field("First Name").FillAsync(d.FirstName);
        await Field("Last Name").FillAsync(d.LastName);
        await Field("Phone").FillAsync(d.Phone);
        await Field("Address Line 1").FillAsync(d.Address);
        await Field("City").FillAsync(d.City);
        await Field("State").FillAsync(d.State);
        await Field("Zip Code").FillAsync(d.Zip);
        await Field("Country").FillAsync(d.Country);
    }
}

// ------------------------------------------------------------------------------------------------ Item (dialog)

public sealed class ItemsPage : MasterListPage
{
    public ItemsPage(IPage page) : base(page, "/masters/items", "Add Item", "Item Name", iconActions: false) { }

    public async Task CreateAsync(ItemData data, string categoryCode)
    {
        await OpenAsync();
        await AddAsync();

        var form = new ItemDialog(Page);
        await form.FillAsync(data, categoryCode);
        await form.SaveAsync();

        await Assertions.Expect(Page.DialogBox()).ToBeHiddenAsync();
        await Page.ExpectToastAsync("Item created successfully");
    }
}

/// <summary>The item form opens as a dialog on top of the item list, so its fields are searched inside the dialog.</summary>
public sealed class ItemDialog : FormBase
{
    public ItemDialog(IPage page) : base(page, page.GetByRole(AriaRole.Dialog)) { }

    public async Task FillAsync(ItemData d, string categoryCode)
    {
        await Assertions.Expect(Root).ToBeVisibleAsync();

        await Page.ChooseOptionAsync(Select("Category"), $"{categoryCode} - ");
        await Field("Item Bar Code").FillAsync(d.BarCode);
        await Field("Item Code").FillAsync(d.Code);
        await Field("Item Name").FillAsync(d.Name);
        await Field("Description").FillAsync("Created by Playwright");
        await Page.ChooseOptionAsync(Select("UOM"), d.Uom, exact: true);
        await Field("Rate").FillAsync(TestData.Number(d.Rate));
        await Field("Minimum Stock").FillAsync(TestData.Number(d.MinimumStock));
        await Field("Maximum Stock").FillAsync(TestData.Number(d.MaximumStock));
    }

    public Task CancelAsync() => Root.GetByRole(AriaRole.Button, new() { Name = "Cancel", Exact = true }).ClickAsync();
}
