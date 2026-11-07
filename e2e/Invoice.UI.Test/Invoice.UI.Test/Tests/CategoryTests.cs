using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

[TestFixture]
public class CategoryTests : UiTest
{
    [Test]
    public async Task Create_search_edit_and_delete_a_category()
    {
        var data = TestData.Category();
        var list = new CategoriesPage(Page);

        // ---- create ----
        await list.CreateAsync(data);
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(data.Name);
        await Expect(list.Row(data.Code)).ToContainTextAsync("Active");

        // ---- edit ----
        var newName = "Ren " + TestData.Token(5);
        await list.EditAsync(data.Code);

        var form = new CategoryForm(Page);
        await Expect(form.Field("Category Code")).ToHaveValueAsync(data.Code);   // the form has loaded the record
        await form.Field("Category Name").FillAsync(newName);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Category updated successfully");
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(newName);

        // ---- delete ----
        await list.DeleteAsync(data.Code);

        await Page.ExpectToastAsync($"{newName} deleted");
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);
    }

    [Test]
    public async Task Saving_an_empty_form_shows_the_required_messages()
    {
        var list = new CategoriesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new CategoryForm(Page);
        await form.SaveAsync();

        await Expect(Page.GetByText("Code is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Name is required")).ToBeVisibleAsync();
        await Page.ExpectToastAsync("Please fix the highlighted errors");
        await Expect(Page).ToHaveURLAsync(new Regex("/masters/categories/create$"));
    }

    [Test]
    public async Task A_code_longer_than_five_characters_is_not_saved()
    {
        var list = new CategoriesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new CategoryForm(Page);
        await form.Field("Category Code").FillAsync("TOOLONG");
        await form.Field("Category Name").FillAsync("Too long code");
        await form.SaveAsync();

        await Page.ExpectToastAsync("Please fix the highlighted errors");
        await Expect(Page).ToHaveURLAsync(new Regex("/masters/categories/create$"));
    }

    [Test]
    public async Task Close_returns_to_the_list_without_saving()
    {
        var data = TestData.Category();
        var list = new CategoriesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new CategoryForm(Page);
        await form.FillAsync(data);
        await form.CloseAsync();

        await Expect(Page).ToHaveURLAsync(new Regex("/masters/categories$"));
        await list.SearchAsync(data.Code);
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);
    }

    [Test]
    public async Task The_status_filter_separates_active_and_inactive_categories()
    {
        var inactive = TestData.Category();
        var list = new CategoriesPage(Page);

        await list.CreateAsync(inactive, active: false);

        await list.SearchAsync(inactive.Code);
        await list.FilterStatusAsync("Active");
        await Expect(list.Row(inactive.Code)).ToHaveCountAsync(0);

        await list.FilterStatusAsync("Inactive");
        await Expect(list.Row(inactive.Code)).ToBeVisibleAsync();
        await Expect(list.Row(inactive.Code)).ToContainTextAsync("Inactive");

        await list.DeleteAsync(inactive.Code);   // tidy up
    }

    [Test, Category("CqrsRules")]
    public async Task A_duplicate_code_is_rejected_with_a_message()
    {
        var data = TestData.Category();
        var list = new CategoriesPage(Page);
        await list.CreateAsync(data);

        await list.AddAsync();
        var form = new CategoryForm(Page);
        await form.FillAsync(data with { Name = "Same code" });
        await form.SaveAsync();

        await Page.ExpectToastAsync("already exists");
        await Expect(Page).ToHaveURLAsync(new Regex("/masters/categories/create$"));

        await form.CloseAsync();
        await list.FindAsync(data.Code);
        await list.DeleteAsync(data.Code);       // tidy up
    }
}
