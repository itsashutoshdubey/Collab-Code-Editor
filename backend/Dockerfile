# We use 'bookworm' (a version of Debian) because it's stable and secure
FROM gcc:14-bookworm

# Create a restricted user named 'sandboxuser' 
# -m ensures a home directory is created
RUN useradd -m sandboxuser

# This creates the /app folder and moves into it
WORKDIR /app

# chown stands for 'change owner'
# We give 'sandboxuser' full control over the /app folder
RUN chown sandboxuser:sandboxuser /app

# Every command from this point forward runs as the sandboxuser
USER sandboxuser



# No CMD or ENTRYPOINT needed because our Node.js 
# script provides the command at runtime.
# In Docker, CMD and ENTRYPOINT are used to tell the container: "As soon as you turn on, run this specific program by default." However, in your architecture, the Node.js script is the "boss" that gives orders. You don't want the container to do the same thing every time it starts; you want it to wait for the specific instructions your Worker sends.

# 1. The "Standard" Way (With CMD)
# Usually, if you were building a website, you would put CMD ["npm", "start"] at the end of your Dockerfile.

# The Result: Every time you run docker run my-website, it automatically starts the website. You have no control over what it does once it's on.

# 2. Your Way (Overriding at Runtime)
# In your executeCode function, you are sending a long string that ends with: ... ${IMAGE_NAME} /bin/sh -c "g++ code.cpp -o a.out && ./a.out"

# When you add that command at the end of your docker run string, Docker ignores any CMD or ENTRYPOINT that might be in the Dockerfile and runs your command instead.

# Why this is better for a Code Engine
# Flexibility: Today you are running g++. Tomorrow, if you wanted to check the version of the compiler, you could send g++ --version without changing the Dockerfile.

# The "Shell" logic: You are doing two things: Compiling AND Running. By sending the command from Node.js, you can use the && operator to make sure the program only runs if the compilation actually works.

# No "Idle" Containers: Since there is no default command, the container only lives for the exact duration it takes to run your script. As soon as ./a.out finishes, the container shuts down and cleans up.