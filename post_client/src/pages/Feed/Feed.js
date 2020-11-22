import React, { Component, Fragment } from "react";

import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";
class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  };

  async componentDidMount() {
    try {
      const res = await fetch("http://localhost:8080/auth/status", {
        headers: {
          Authorization: `Bearer ${this.props.token}`,
        },
      });
      if (res.status !== 200) {
        throw new Error("Failed to fetch user status.");
      }
      const resData = await res.json();
      this.setState({ status: resData.status });
    } catch (err) {
      this.catchError(err);
    }
    this.loadPosts();
  }

  loadPosts = async (direction) => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlQuery = {
      query: `
        {
          posts(page: ${page}) {
            posts {
              _id
              title
              content
              imageUrl
              creator {
                name
                _id
              }
              createdAt
            }
            totalPosts
          }
        }
      `,
    };
    try {
      const res = await fetch(`http://localhost:8080/graphql`, {
        method: "POST",
        body: JSON.stringify(graphqlQuery),
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          "Content-Type": "application/json",
        },
      });

      const resData = await res.json();
      if (resData.errors) {
        throw new Error("Fetching posts failed!");
      }
      const { posts, totalPosts } = resData.data.posts;
      this.setState({
        posts: posts.map((post) => {
          return {
            ...post,
            imagePath: post.imageUrl,
          };
        }),
        totalPosts,
        postsLoading: false,
      });
    } catch (err) {
      this.catchError(err);
    }
  };

  statusUpdateHandler = async (event) => {
    event.preventDefault();
    const { status } = this.state;
    try {
      const res = await fetch("http://localhost:8080/auth/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });
      if (res.status !== 200 && res.status !== 201) {
        throw new Error("Can't update status!");
      }
    } catch (err) {
      this.catchError(err);
    }
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = (postId) => {
    this.setState((prevState) => {
      const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost,
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = async (postData) => {
    const { editPost } = this.state;
    this.setState({
      editLoading: true,
    });
    // built in data type for browser
    const formData = new FormData();
    formData.append("image", postData.image);
    if (editPost) {
      formData.append("oldPath", editPost.imagePath);
    }
    try {
      const fileRes = await fetch("http://localhost:8080/post-image", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.props.token}`,
        },
        body: formData,
      });
      const fileResData = await fileRes.json();
      const { filePath: imageUrl } = fileResData;

      let graphqlQuery = {
        query: `
        mutation {
          createPost(postInput: {
            title: "${postData.title}",
            content: "${postData.content}",
            imageUrl: "${imageUrl}"
          }) {
            _id
            title
            content
            imageUrl
            creator {
              name
              _id
            }
            createdAt
          }
        }
      `,
      };

      if (this.state.editPost) {
        graphqlQuery = {
          query: `
          mutation {
            updatePost(id: "${this.state.editPost._id}" ,postInput: {
              title: "${postData.title}",
              content: "${postData.content}",
              imageUrl: "${imageUrl}"
            }) {
              _id
              title
              content
              imageUrl
              creator {
                name
              }
              createdAt
            }
          }
        `,
        };
      }

      try {
        const res = await fetch("http://localhost:8080/graphql", {
          method: "POST",
          // header is set automatically by formdata
          body: JSON.stringify(graphqlQuery),
          headers: {
            Authorization: `Bearer ${this.props.token}`,
            "Content-Type": "application/json",
          },
        });
        const resData = await res.json();
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error(
            "validation failed. Make sure the email address isn't used yet"
          );
        }
        if (resData.errors) {
          throw new Error("User login failed!");
        }
        let resDateField = "createPost";
        if (this.state.editPost) {
          resDateField = "updatePost";
        }
        const {
          _id,
          title,
          imageUrl: imagePath,
          content,
          creator,
          createdAt,
        } = resData.data[resDateField];
        const post = {
          _id,
          title,
          content,
          creator,
          createdAt,
          imagePath,
        };

        this.setState((prevState) => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              (p) => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = post;
          } else {
            // fix: when adding a new post with only one post being loaded,
            // we end up with one post on the starting page (instead of the expected two posts).
            if (prevState.posts.length >= 2) {
              updatedPosts.pop();
            }
            updatedPosts.unshift(post);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
          };
        });
      } catch (err) {
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        });
        console.error(err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = async (postId) => {
    this.setState({ postsLoading: true });
    const graphqlQuery = {
      query: `
        mutation {
          deletePost(id: "${postId}")
        }
      `,
    };
    try {
      const res = await fetch(`http://localhost:8080/graphql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphqlQuery),
      });
      const resData = await res.json();
      if (resData.errors) throw new Error("Deleting the post failed");
      this.loadPosts();
      // this.setState((prevState) => {
      //   const updatedPosts = prevState.posts.filter((p) => p._id !== postId);
      //   return { posts: updatedPosts, postsLoading: false };
      // });
    } catch (err) {
      this.setState({ postsLoading: false });
      console.error(err);
    }
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = (error) => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit" disabled={!this.state.status}>
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map((post) => {
                return (
                  <Post
                    key={post._id}
                    id={post._id}
                    author={post.creator.name}
                    authorId={post.creator._id}
                    date={new Date(post.createdAt).toLocaleDateString("en-US")}
                    title={post.title}
                    image={post.imageUrl}
                    content={post.content}
                    onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                    onDelete={this.deletePostHandler.bind(this, post._id)}
                  />
                );
              })}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
