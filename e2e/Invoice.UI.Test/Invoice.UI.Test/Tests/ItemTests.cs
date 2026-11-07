using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

[TestFixture]
public class ItemTests : UiTest
{
    [Test]
    public async Task Create_edit_and_delete_an_item_through_the_dialog()
    {
        var category = TestData.Category();
        var item = TestData.Item();

        await new CategoriesPage(Page).CreateAsync(category);

        // ---- create (opens a dialog) ----
        var items = new ItemsPage(Page);
        await items.CreateAsync(item, category.Code);

        await items.FindAsync(item.Name);
        await Expect(items.Row(item.Name)).ToContainTextAsync(item.Code);
        await Expect(items.Row(item.Name)).ToContainTextAsync(category.Name);

        // ---- edit: change the rate ----
        await items.EditAsync(item.Name);

        var dialog = new ItemDialog(Page);
        await Expect(dialog.Field("Item Code")).ToHaveValueAsync(item.Code);
        await dialog.Field("Rate").FillAsync("250");
        await dialog.SaveAsync();

        await Expect(Page.DialogBox()).ToBeHiddenAsync();
        await Page.ExpectToastAsync("Item updated successfully");

        await items.FindAsync(item.Name);
        await Expect(items.Row(item.Name)).ToContainTextAsync("250");

        // ---- delete ----
        await items.DeleteAsync(item.Name);

        await Page.ExpectToastAsync("Item deleted successfully");
        await Expect(items.Row(item.Name)).ToHaveCountAsync(0);

        // the category has no items any more, so it can go too
        var categories = new CategoriesPage(Page);
        await categories.OpenAsync();
        await categories.FindAsync(category.Code);
        await categories.DeleteAsync(category.Code);
    }

    [Test]
    public async Task Saving_an_empty_item_form_keeps_the_dialog_open_and_shows_errors()
    {
        var items = new ItemsPage(Page);
        await items.OpenAsync();
        await items.AddAsync();

        var dialog = new ItemDialog(Page);
        await dialog.SaveAsync();

        await Expect(Page.DialogBox()).ToBeVisibleAsync();
        await Expect(dialog.Errors.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Cancel_closes_the_dialog_without_creating_an_item()
    {
        var items = new ItemsPage(Page);
        await items.OpenAsync();
        await items.AddAsync();

        await new ItemDialog(Page).CancelAsync();

        await Expect(Page.DialogBox()).ToBeHiddenAsync();
    }
}
