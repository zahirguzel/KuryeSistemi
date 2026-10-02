using FluentAssertions;
using FluentValidation;
using KuryeSistemi.API.Filters;
using KuryeSistemi.Application.Common.Models;
using KuryeSistemi.Application.DTOs.Auth;
using KuryeSistemi.Application.Validators.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace KuryeSistemi.Tests.Validators;

public class ValidationFilterTests
{
    [Fact]
    public async Task ValidationFilter_WhenValidationFails_ShouldReturnServiceResultBadRequest()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddSingleton<IValidator<LoginRequestDto>>(new LoginRequestDtoValidator());
        var serviceProvider = services.BuildServiceProvider();

        var httpContext = new DefaultHttpContext { RequestServices = serviceProvider };
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());

        // Geçersiz model (email boş, şifre boş)
        var invalidModel = new LoginRequestDto("", "");
        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?> { ["request"] = invalidModel },
            new object());

        var filter = new ValidationFilter();
        bool nextCalled = false;
        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        // Assert
        nextCalled.Should().BeFalse("Doğrulama başarısız olduğunda sonraki middleware/action çağrılmamalıdır");
        actionExecutingContext.Result.Should().BeOfType<BadRequestObjectResult>();

        var badRequestResult = (BadRequestObjectResult)actionExecutingContext.Result!;
        badRequestResult.StatusCode.Should().Be(400);

        var serviceResult = badRequestResult.Value as ServiceResult<object>;
        serviceResult.Should().NotBeNull();
        serviceResult!.IsSuccess.Should().BeFalse();
        serviceResult.StatusCode.Should().Be(400);
        serviceResult.Errors.Should().NotBeEmpty();
        serviceResult.Errors.Should().Contain(e => e.Contains("E-posta"));
        serviceResult.Errors.Should().Contain(e => e.Contains("Şifre"));
    }

    [Fact]
    public async Task ValidationFilter_WhenValidationPasses_ShouldCallNext()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddSingleton<IValidator<LoginRequestDto>>(new LoginRequestDtoValidator());
        var serviceProvider = services.BuildServiceProvider();

        var httpContext = new DefaultHttpContext { RequestServices = serviceProvider };
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());

        var validModel = new LoginRequestDto("test@example.com", "Password123*");
        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?> { ["request"] = validModel },
            new object());

        var filter = new ValidationFilter();
        bool nextCalled = false;
        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), new object()));
        };

        // Act
        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        // Assert
        nextCalled.Should().BeTrue();
        actionExecutingContext.Result.Should().BeNull();
    }
}
