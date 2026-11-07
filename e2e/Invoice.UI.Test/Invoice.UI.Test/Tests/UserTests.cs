using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

[TestFixture]
public class UserTests : UiTest
{
    [Test]
    public async Task Create_edit_and_delete_a_user()
    {
        var user = TestData.User();
        var list = new UsersPage(Page);

        await list.CreateAsync(user);
        await list.FindAsync(user.UserName);
        await Expect(list.Row(user.UserName)).ToContainTextAsync(user.Email);

        // edit: the password box is not part of the edit form
        await list.EditAsync(user.UserName);
        var form = new UserForm(Page);
        await Expect(form.Field("User Name")).ToHaveValueAsync(user.UserName);
        await form.Field("First Name").FillAsync("Renamed");
        await form.SaveAsync();

        await Page.ExpectToastAsync("User updated successfully");
        await list.FindAsync(user.UserName);

        // delete
        await list.DeleteAsync(user.UserName);
        await Page.ExpectToastAsync($"{user.UserName} deleted");
        await Expect(list.Row(user.UserName)).ToHaveCountAsync(0);
    }

    [Test]
    public async Task A_short_password_and_a_bad_email_are_rejected_before_saving()
    {
        var user = TestData.User();
        var list = new UsersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new UserForm(Page);
        await form.FillAsync(user with { Password = "short", Email = "not-an-email" });
        await form.SaveAsync();

        await Expect(Page.GetByText("Password must be at least 8 characters.")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Enter a valid email")).ToBeVisibleAsync();
        await Expect(Page).ToHaveURLAsync(new Regex("/masters/users/create$"));
    }

    [Test]
    public async Task Required_fields_are_checked()
    {
        var list = new UsersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        await new UserForm(Page).SaveAsync();

        await Expect(Page.GetByText("User name is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("First name is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Last name is required")).ToBeVisibleAsync();
    }

    [Test, Category("CqrsRules")]
    public async Task A_duplicate_user_name_is_rejected()
    {
        var user = TestData.User();
        var list = new UsersPage(Page);
        await list.CreateAsync(user);

        await list.AddAsync();
        var form = new UserForm(Page);
        await form.FillAsync(user with { Email = "other-" + user.Email });
        await form.SaveAsync();

        await Page.ExpectToastAsync("already exists");

        await form.CloseAsync();
        await list.FindAsync(user.UserName);
        await list.DeleteAsync(user.UserName);
    }
}
