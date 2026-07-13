package com.knust.classmate.auth;

import com.knust.classmate.config.JwtUtil;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import com.knust.classmate.user.UserRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Autowired
    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager,
                       UserDetailsService userDetailsService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email()))
            throw new RuntimeException("An account with this email already exists.");
        if (userRepository.existsByIndexNumber(request.indexNumber()))
            throw new RuntimeException("An account with this index number already exists.");
        if (userRepository.existsByReferenceNumber(request.referenceNumber()))
            throw new RuntimeException("An account with this reference number already exists.");

        UserRole role = UserRole.STUDENT;
        if ("course_rep".equalsIgnoreCase(request.role())) {
            role = UserRole.COURSE_REP;
        }

        String status = role == UserRole.COURSE_REP ? "PENDING" : "ACTIVE";

        User user = User.builder()
            .fullName(request.fullName())
            .indexNumber(request.indexNumber().toUpperCase())
            .referenceNumber(request.referenceNumber().toUpperCase())
            .email(request.email().toLowerCase())
            .password(passwordEncoder.encode(request.password()))
            .programme(request.programme())
            .level(request.level())
            .classGroup(request.classGroup())
            .role(role)
            .status(status)
            .build();

        return UserResponse.from(userRepository.save(user));
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByIdentifier(request.identifier())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if ("PENDING".equals(user.getStatus()))
            throw new BadCredentialsException("Your course rep request is pending admin approval.");
        if ("REJECTED".equals(user.getStatus()))
            throw new BadCredentialsException("Your course rep request was rejected. Contact admin.");

        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(user.getEmail(), request.password()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return new LoginResponse(token, UserResponse.from(user));
    }
}
