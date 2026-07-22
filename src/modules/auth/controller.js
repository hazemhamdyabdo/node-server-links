import * as authService from "./service.js";

export async function loginController(req, res, next) {
  try {
    const {
      tokens: { rawToken, accessToken },
      user,
    } = await authService.loginUser(req.body);

    res.cookie("refreshToken", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    res.status(200).json({
      message: "Welcome Back",
      data: {
        accessToken,
        ...user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerController(req, res, next) {
  try {
    const newUser = await authService.registerUser(req.body);
    res.status(201).json({
      data: newUser,
      message: "User register successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logoutService(refreshToken);
    }

    res.clearCookie("refreshToken");
    res.status(200).json({
      message: "success",
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    const { accessToken, rawToken } =
      await authService.refreshTokenService(refreshToken);

    res.cookie("refreshToken", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    res.status(200).json({
      message: "success",
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
}
